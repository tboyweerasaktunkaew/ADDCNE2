import { TaskItem, ConflictRecord } from '../types/grid';

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] in "HH:mm" overlap.
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  
  // Format comparison
  const [hA1, mA1] = startA.split(':').map(Number);
  const [hA2, mA2] = endA.split(':').map(Number);
  const [hB1, mB1] = startB.split(':').map(Number);
  const [hB2, mB2] = endB.split(':').map(Number);

  const minutesA1 = (hA1 || 0) * 60 + (mA1 || 0);
  const minutesA2 = (hA2 || 0) * 60 + (mA2 || 0);
  const minutesB1 = (hB1 || 0) * 60 + (mB1 || 0);
  const minutesB2 = (hB2 || 0) * 60 + (mB2 || 0);

  // Overlap condition: start of A is before end of B, and start of B is before end of A
  return minutesA1 < minutesB2 && minutesB1 < minutesA2;
}

/**
 * Analyze an array of TaskItems and detect all operational grid conflicts.
 */
export function detectConflicts(tasks: TaskItem[]): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  const processedPairs = new Set<string>();

  // Filter out cancelled tasks
  const activeTasks = tasks.filter(
    (t) => t.Daily_Status !== 'ยกเลิก' && t.Overall_Status !== 'ยกเลิก'
  );

  // Group by date for efficient comparison
  const tasksByDate = new Map<string, TaskItem[]>();
  for (const task of activeTasks) {
    if (!task.Work_Date) continue;
    const list = tasksByDate.get(task.Work_Date) || [];
    list.push(task);
    tasksByDate.set(task.Work_Date, list);
  }

  tasksByDate.forEach((dayTasks, date) => {
    for (let i = 0; i < dayTasks.length; i++) {
      for (let j = i + 1; j < dayTasks.length; j++) {
        const taskA = dayTasks[i];
        const taskB = dayTasks[j];

        // Skip if same Sub_ID
        if (taskA.Sub_ID === taskB.Sub_ID) continue;

        const pairKey = [taskA.Sub_ID, taskB.Sub_ID].sort().join(':::');
        if (processedPairs.has(pairKey)) continue;

        const feederA = (taskA.Feeder || '').trim().toUpperCase();
        const feederB = (taskB.Feeder || '').trim().toUpperCase();

        const samePrimaryFeeder = feederA && feederB && feederA === feederB;

        const timeOverlaps = isTimeOverlapping(
          taskA.Start_Time,
          taskA.End_Time,
          taskB.Start_Time,
          taskB.End_Time
        );

        if (samePrimaryFeeder && timeOverlaps) {
          processedPairs.add(pairKey);
          conflicts.push({
            id: `CONF-${date}-${taskA.Sub_ID}-${taskB.Sub_ID}`,
            type: 'CRITICAL',
            reason: 'SAME_FEEDER_TIME_OVERLAP',
            date,
            feeder: feederA,
            subIds: [taskA.Sub_ID, taskB.Sub_ID],
            jobIds: Array.from(new Set([taskA.Job_ID, taskB.Job_ID])),
            timeRange: `${taskA.Start_Time}-${taskA.End_Time} vs ${taskB.Start_Time}-${taskB.End_Time}`,
            description: `พบการดับไฟทับซ้อนในฟีดเดอร์หลักเดียวกัน (${feederA}) ในช่วงเวลาคาบเกี่ยวกัน (${taskA.Start_Time}-${taskA.End_Time} น. และ ${taskB.Start_Time}-${taskB.End_Time} น.)`,
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Get map of subId -> array of conflict records for fast lookup
 */
export function getSubIdConflictMap(
  conflicts: ConflictRecord[]
): Map<string, ConflictRecord[]> {
  const map = new Map<string, ConflictRecord[]>();
  for (const c of conflicts) {
    for (const subId of c.subIds) {
      const list = map.get(subId) || [];
      list.push(c);
      map.set(subId, list);
    }
  }
  return map;
}
