import { DAY_KEYS, type DayKey } from "@/src/constants/availability";
import { TimeBlock, type DateSpecificAvailability } from "@/src/models/Availability";
import { timeToMinutes } from "@/src/lib/availability-utils";

export interface InspectorAvailability {
  days: Record<DayKey, { openSchedule: TimeBlock[]; timeSlots: string[] }>;
  dateSpecific: DateSpecificAvailability[];
}

/**
 * Convert JavaScript Date to DayKey
 * JavaScript Date.getDay() returns 0 for Sunday, 1 for Monday, etc.
 * DAY_KEYS[0] is "sunday", DAY_KEYS[1] is "monday", etc.
 */
export function getDayKeyFromDate(date: Date): DayKey {
  const dayIndex = date.getDay();
  return DAY_KEYS[dayIndex];
}

/**
 * Check if a time matches any time slot
 */
export function checkTimeSlotAvailability(time: string, timeSlots: string[]): boolean {
  return timeSlots.includes(time);
}

/**
 * Check if a time falls within any time block
 * Time must be >= start and < end
 */
export function checkOpenScheduleAvailability(time: string, blocks: TimeBlock[]): boolean {
  const timeMinutes = timeToMinutes(time);
  
  return blocks.some((block) => {
    const startMinutes = timeToMinutes(block.start);
    const endMinutes = timeToMinutes(block.end);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  });
}

/**
 * Get all available times for a day based on view mode
 */
export function getAvailableTimesForDay(
  dayKey: DayKey,
  viewMode: "openSchedule" | "timeSlots",
  availability: InspectorAvailability
): string[] {
  const dayData = availability.days[dayKey];
  
  if (!dayData) {
    return [];
  }

  if (viewMode === "timeSlots") {
    // For time slots, return all available time slots
    return [...dayData.timeSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  } else {
    // For open schedule, we need to generate all times within the blocks
    const availableTimes: string[] = [];
    
    dayData.openSchedule.forEach((block) => {
      const startMinutes = timeToMinutes(block.start);
      const endMinutes = timeToMinutes(block.end);
      
      // Generate times at 30-minute intervals within the block
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeString = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
        availableTimes.push(timeString);
      }
    });
    
    return availableTimes.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }
}

/**
 * Check if inspector is available for a specific date and time
 * Returns availability status and all available times for that day
 * 
 * IMPORTANT: Date-specific availability means the inspector is NOT available during that time.
 * It overrides the weekly schedule - if a time falls within a date-specific block, the inspector is not available.
 */
export function checkInspectorAvailability(
  date: Date,
  time: string,
  viewMode: "openSchedule" | "timeSlots",
  availability: InspectorAvailability
): { available: boolean; availableTimes: string[] } {
  const dayKey = getDayKeyFromDate(date);
  const dateString = formatDateToISO(date);
  
  // Check if there are date-specific entries for this date (these indicate NOT available times)
  const dateSpecificEntries = availability.dateSpecific.filter(
    (entry) => entry.date === dateString
  );
  
  // First, get available times from weekly schedule
  const dayData = availability.days[dayKey];
  
  if (!dayData) {
    return { available: false, availableTimes: [] };
  }
  
  let weeklyAvailableTimes: string[] = [];
  let isAvailableFromWeekly = false;
  
  if (viewMode === "timeSlots") {
    weeklyAvailableTimes = [...dayData.timeSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    isAvailableFromWeekly = checkTimeSlotAvailability(time, dayData.timeSlots);
  } else {
    weeklyAvailableTimes = getAvailableTimesForDay(dayKey, viewMode, availability);
    isAvailableFromWeekly = checkOpenScheduleAvailability(time, dayData.openSchedule);
  }
  
  // If no date-specific entries, use weekly schedule as-is
  if (dateSpecificEntries.length === 0) {
    return { 
      available: isAvailableFromWeekly, 
      availableTimes: weeklyAvailableTimes 
    };
  }
  
  // Date-specific entries exist - they indicate times when inspector is NOT available
  // Remove unavailable times from weekly schedule
  let availableTimes: string[] = [];
  let isAvailable = isAvailableFromWeekly;
  
  if (viewMode === "timeSlots") {
    // For time slots, date-specific entries indicate unavailable time slots
    const unavailableTimeSlots = new Set(dateSpecificEntries.map(entry => entry.start));
    
    // Check if selected time is in the unavailable slots
    if (unavailableTimeSlots.has(time)) {
      isAvailable = false;
    }
    
    // Filter out unavailable time slots from weekly schedule
    availableTimes = weeklyAvailableTimes.filter(slot => !unavailableTimeSlots.has(slot));
  } else {
    // For open schedule, date-specific entries indicate unavailable time blocks
    const unavailableBlocks = dateSpecificEntries.map(entry => ({
      start: entry.start,
      end: entry.end,
    }));
    
    // Check if selected time falls within any unavailable block
    if (checkOpenScheduleAvailability(time, unavailableBlocks)) {
      isAvailable = false;
    }
    
    // Remove times that fall within unavailable blocks
    availableTimes = weeklyAvailableTimes.filter(slot => {
      return !checkOpenScheduleAvailability(slot, unavailableBlocks);
    });
  }
  
  return { available: isAvailable, availableTimes };
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

