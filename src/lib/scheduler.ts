/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, addMinutes, addHours, isWithinInterval, parse, parseISO, startOfDay } from 'date-fns';

export interface Nurse {
  id: string;
  name: string;
  machineCode: string;
}

export interface Patient {
  id: string;
  stt: number;
  patientId: string;
  name: string;
  date: string; // YYYY-MM-DD
  orderTime: string; // HH:mm
  times: number; // 1, 2, 3
  notes: string;
}

export interface TreatmentSession {
  id: string;
  patientId: string;
  patientName: string;
  sessionOrder: number; // 1, 2, 3
  orderTime: string;
  startTime: Date;
  endTime: Date;
  nurseId: string;
  nurseName: string;
  machineCode: string;
  status: 'valid' | 'warning' | 'conflict';
  notes: string;
}

export const NURSES: Nurse[] = [
  { id: 'DD1', name: 'ĐD1', machineCode: '032' },
  { id: 'DD2', name: 'ĐD2', machineCode: '121' },
  { id: 'DD3', name: 'ĐD3', machineCode: '368' }
];

export const TREATMENT_DURATION = 20; // minutes
export const START_DELAY = 8; // minutes
export const SESSION_GAP = 1; // minute

/**
 * Scheduling logic
 */
export function scheduleTreatments(patients: Patient[], customNurses: Nurse[] = NURSES, totalPatientsInDept?: number): TreatmentSession[] {
  const sortedPatients = [...patients].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.orderTime}`);
    const dateB = new Date(`${b.date}T${b.orderTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const participantCount = totalPatientsInDept !== undefined ? totalPatientsInDept : patients.length;
  const activeNurses = participantCount >= 30 ? customNurses : customNurses.slice(0, 2);
  const sessions: TreatmentSession[] = [];

  // Track sessions by nurse for fast O(1) lookup
  const nurseSessionsMap = new Map<string, TreatmentSession[]>();
  activeNurses.forEach(n => nurseSessionsMap.set(n.id, []));

  sortedPatients.forEach((patient, index) => {
    // 1. Assign Nurse (Round-robin based on index for the first session)
    const nurse = activeNurses[index % activeNurses.length];
    const assignedNurseSessions = nurseSessionsMap.get(nurse.id) || [];

    // 2. Generate Sessions
    const patientSessions: TreatmentSession[] = [];
    const baseTimeStr = `${patient.date} ${patient.orderTime}`;
    const baseTime = parse(baseTimeStr, 'yyyy-MM-dd HH:mm', new Date());

    if (isNaN(baseTime.getTime())) {
      console.warn(`Invalid order time for patient ${patient.name}: ${baseTimeStr}`);
      return; // Skip this patient
    }

    for (let i = 1; i <= patient.times; i++) {
      let sessionStartTime: Date;
      
      if (i === 1) {
        sessionStartTime = addMinutes(baseTime, START_DELAY);
      } else if (i === 2) {
        // Lần 2 = giờ bắt đầu lần 1 + 12 giờ (nếu có 2 lần) hoặc + 8 giờ (nếu có 3 lần)
        const gapHours = patient.times === 2 ? 12 : 8;
        sessionStartTime = addHours(patientSessions[0].startTime, gapHours);
      } else {
        // Lần 3 = giờ bắt đầu lần 2 + 8 giờ (theo y lệnh + 8 phút, không tự động giảm 1h)
        sessionStartTime = addHours(patientSessions[1].startTime, 8);
      }

      let sessionEndTime = addMinutes(sessionStartTime, TREATMENT_DURATION);

      // 3. Fast Conflict Resolution: Jump directly to the end of conflicting session + gap
      let attempts = 0;
      while (attempts < 500) {
        const startMs = sessionStartTime.getTime();
        const endMs = sessionEndTime.getTime();
        const gapMs = SESSION_GAP * 60 * 1000;

        // Find if any existing session for this nurse conflicts
        const conflict = assignedNurseSessions.find(s => {
          const sStartMs = s.startTime.getTime();
          const sEndMs = s.endTime.getTime();
          return (startMs < sEndMs + gapMs) && (endMs > sStartMs - gapMs);
        });

        if (!conflict) {
          break; // Slot is free!
        }

        // Jump directly to the earliest available moment after the conflicting session
        sessionStartTime = addMinutes(conflict.endTime, SESSION_GAP);
        sessionEndTime = addMinutes(sessionStartTime, TREATMENT_DURATION);
        attempts++;
      }

      const session: TreatmentSession = {
        id: `${patient.id}-${i}`,
        patientId: patient.patientId,
        patientName: patient.name,
        sessionOrder: i,
        orderTime: patient.orderTime,
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        nurseId: nurse.id,
        nurseName: nurse.name,
        machineCode: nurse.machineCode,
        status: 'valid',
        notes: patient.notes
      };

      patientSessions.push(session);
      assignedNurseSessions.push(session);
      sessions.push(session);
    }
  });

  return sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
