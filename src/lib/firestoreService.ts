import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Patient, TreatmentSession, Nurse } from './scheduler';
import { DailySchedule, saveScheduleByDate, saveDepartmentMachines } from './dateStorage';

// Helper to serialize sessions for Firestore (ensure Date objects are strings)
function serializeSessions(sessions: TreatmentSession[]) {
  return sessions.map(s => ({
    ...s,
    startTime: s.startTime instanceof Date ? s.startTime.toISOString() : s.startTime,
    endTime: s.endTime instanceof Date ? s.endTime.toISOString() : s.endTime,
  }));
}

// Helper to deserialize sessions from Firestore
function deserializeSessions(sessions: any[]): TreatmentSession[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.map(s => ({
    ...s,
    startTime: typeof s.startTime === 'string' ? new Date(s.startTime) : s.startTime,
    endTime: typeof s.endTime === 'string' ? new Date(s.endTime) : s.endTime,
  }));
}

export async function saveScheduleToFirestore(
  dateStr: string,
  patients: Patient[],
  sessions: TreatmentSession[],
  totalPatients: number
): Promise<void> {
  const path = `schedules/${dateStr}`;
  try {
    const serializedSessions = serializeSessions(sessions);
    const data: Record<string, any> = {
      date: dateStr,
      patients,
      sessions: serializedSessions,
      totalPatients: Number(totalPatients) || 0,
      updatedAt: new Date().toISOString(),
    };

    if (auth.currentUser?.email || auth.currentUser?.uid) {
      data.updatedBy = auth.currentUser.email || auth.currentUser.uid;
    }

    await setDoc(doc(db, 'schedules', dateStr), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getScheduleFromFirestore(dateStr: string): Promise<DailySchedule | null> {
  const path = `schedules/${dateStr}`;
  try {
    const docSnap = await getDoc(doc(db, 'schedules', dateStr));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      date: data.date,
      patients: data.patients || [],
      sessions: deserializeSessions(data.sessions),
      totalPatients: data.totalPatients || 0,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToSchedule(
  dateStr: string,
  onUpdate: (schedule: DailySchedule | null) => void
): () => void {
  const path = `schedules/${dateStr}`;
  return onSnapshot(
    doc(db, 'schedules', dateStr),
    (docSnap) => {
      if (!docSnap.exists()) {
        onUpdate(null);
        return;
      }
      const data = docSnap.data();
      const schedule: DailySchedule = {
        date: data.date,
        patients: data.patients || [],
        sessions: deserializeSessions(data.sessions),
        totalPatients: data.totalPatients || 0,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      // Keep local storage synchronized
      saveScheduleByDate(schedule.date, schedule.patients, schedule.sessions, schedule.totalPatients);
      onUpdate(schedule);
    },
    (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn(`Firestore schedule subscription offline notice for ${path}:`, error?.message || error);
      }
    }
  );
}

export async function fetchAllAvailableDatesFromFirestore(): Promise<string[]> {
  const path = 'schedules';
  try {
    const snapshot = await getDocs(collection(db, 'schedules'));
    const dates: string[] = [];
    snapshot.forEach(doc => {
      if (doc.id && /^\d{4}-\d{2}-\d{2}$/.test(doc.id)) {
        dates.push(doc.id);
      }
    });
    return dates.sort((a, b) => b.localeCompare(a));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDepartmentSettingsToFirestore(
  machines: string[],
  nurses?: Nurse[]
): Promise<void> {
  const path = 'settings/department';
  try {
    const data: Record<string, any> = {
      machines,
      updatedAt: new Date().toISOString(),
    };
    if (nurses && nurses.length > 0) {
      data.nurses = nurses;
    }
    if (auth.currentUser?.email || auth.currentUser?.uid) {
      data.updatedBy = auth.currentUser.email || auth.currentUser.uid;
    }
    await setDoc(doc(db, 'settings', 'department'), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToDepartmentSettings(
  onUpdate: (data: { machines?: string[]; nurses?: Nurse[] }) => void
): () => void {
  const path = 'settings/department';
  return onSnapshot(
    doc(db, 'settings', 'department'),
    (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (Array.isArray(data.machines) && data.machines.length > 0) {
        saveDepartmentMachines(data.machines);
      }
      onUpdate({
        machines: data.machines,
        nurses: data.nurses,
      });
    },
    (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        handleFirestoreError(error, OperationType.GET, path);
      } else {
        console.warn(`Firestore settings subscription offline notice for ${path}:`, error?.message || error);
      }
    }
  );
}
