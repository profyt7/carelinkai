/**
 * Timezone utility tests
 * 
 * Tests for timezone-aware helper functions used in the calendar availability API.
 */

// Re-implement the helper functions from route.ts for testing
function getHourInTimeZone(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? Number(hourPart.value) : date.getUTCHours();
  } catch {
    // Invalid/unsupported timezone → fall back to UTC hour
    return date.getUTCHours();
  }
}

function getDayInTimeZone(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const weekdayStr = dtf.format(date); // e.g., "Sun"
    // Map short names to 0-6
    const map = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekdayStr] ?? date.getUTCDay();
  } catch {
    // Invalid/unsupported timezone → fall back to UTC day
    return date.getUTCDay();
  }
}

describe('Timezone Utilities', () => {
  describe('getHourInTimeZone', () => {
    test('should return correct hour in UTC timezone', () => {
      const date = new Date('2025-07-01T13:00:00Z');
      expect(getHourInTimeZone(date, 'UTC')).toBe(13);
    });

    test('should return correct hour in America/New_York timezone (EDT)', () => {
      const date = new Date('2025-07-01T13:00:00Z'); // Summer, EDT
      expect(getHourInTimeZone(date, 'America/New_York')).toBe(9); // UTC-4
    });

    test('should return correct hour in America/New_York timezone (EST)', () => {
      const date = new Date('2025-12-01T13:00:00Z'); // Winter, EST
      expect(getHourInTimeZone(date, 'America/New_York')).toBe(8); // UTC-5
    });

    test('should handle midnight edge case', () => {
      const date = new Date('2025-07-01T04:00:00Z'); // 00:00 EDT
      expect(getHourInTimeZone(date, 'America/New_York')).toBe(0);
    });

    test('should handle invalid timezone by falling back to UTC', () => {
      const date = new Date('2025-07-01T13:00:00Z');
      // intentionally testing with invalid timezone
      expect(getHourInTimeZone(date, 'Invalid/Timezone')).toBe(13);
    });
  });

  describe('getDayInTimeZone', () => {
    test('should return correct day in UTC timezone', () => {
      const date = new Date('2025-07-01T13:00:00Z'); // Tuesday in UTC
      expect(getDayInTimeZone(date, 'UTC')).toBe(2); // Tuesday = 2
    });

    test('should return correct day in America/New_York timezone (summer)', () => {
      const date = new Date('2025-07-01T13:00:00Z'); // Tuesday in UTC, also Tuesday in NY
      expect(getDayInTimeZone(date, 'America/New_York')).toBe(2); // Tuesday = 2
    });

    test('should return correct day in America/New_York timezone (winter)', () => {
      const date = new Date('2025-12-01T13:00:00Z'); // Monday in UTC, also Monday in NY
      expect(getDayInTimeZone(date, 'America/New_York')).toBe(1); // Monday = 1
    });

    test('should handle day change at timezone boundary', () => {
      // 03:00 UTC on July 2nd is 23:00 on July 1st in EDT
      const date = new Date('2025-07-02T03:00:00Z');
      expect(getDayInTimeZone(date, 'UTC')).toBe(3); // Wednesday = 3
      expect(getDayInTimeZone(date, 'America/New_York')).toBe(2); // Tuesday = 2
    });

    test('should detect weekend correctly in different timezones', () => {
      // Saturday test case
      const saturdayDate = new Date('2025-09-06T15:00:00Z'); // Saturday in UTC
      expect(getDayInTimeZone(saturdayDate, 'UTC')).toBe(6); // Saturday = 6
      expect(getDayInTimeZone(saturdayDate, 'America/New_York')).toBe(6); // Still Saturday in NY
      
      // Sunday test case
      const sundayDate = new Date('2025-09-07T03:00:00Z'); // Sunday in UTC
      expect(getDayInTimeZone(sundayDate, 'UTC')).toBe(0); // Sunday = 0
      expect(getDayInTimeZone(sundayDate, 'America/New_York')).toBe(6); // Still Saturday in NY
    });

    test('should handle invalid timezone by falling back to UTC day', () => {
      const date = new Date('2025-07-01T13:00:00Z');
      // intentionally testing with invalid timezone
      expect(getDayInTimeZone(date, 'Invalid/Timezone')).toBe(date.getUTCDay());
    });
  });

  describe('Business Hours and Weekend Detection', () => {
    test('9 AM to 5 PM business hours should be correctly detected in local timezone', () => {
      // 13:00 UTC = 9:00 EDT (business hours start)
      const businessStart = new Date('2025-07-01T13:00:00Z');
      expect(getHourInTimeZone(businessStart, 'America/New_York')).toBe(9);
      
      // 21:00 UTC = 17:00 EDT (business hours end)
      const businessEnd = new Date('2025-07-01T21:00:00Z');
      expect(getHourInTimeZone(businessEnd, 'America/New_York')).toBe(17);
      
      // 12:00 UTC = 8:00 EDT (before business hours)
      const beforeHours = new Date('2025-07-01T12:00:00Z');
      expect(getHourInTimeZone(beforeHours, 'America/New_York')).toBe(8);
      
      // 22:00 UTC = 18:00 EDT (after business hours)
      const afterHours = new Date('2025-07-01T22:00:00Z');
      expect(getHourInTimeZone(afterHours, 'America/New_York')).toBe(18);
    });

    test('weekend days should be correctly detected in local timezone', () => {
      // Test for Saturday
      const saturday = new Date('2025-09-06T15:00:00Z');
      const saturdayDay = getDayInTimeZone(saturday, 'America/New_York');
      expect(saturdayDay).toBe(6);
      expect(saturdayDay === 0 || saturdayDay === 6).toBe(true); // Is weekend
      
      // Test for Sunday
      const sunday = new Date('2025-09-07T15:00:00Z');
      const sundayDay = getDayInTimeZone(sunday, 'America/New_York');
      expect(sundayDay).toBe(0);
      expect(sundayDay === 0 || sundayDay === 6).toBe(true); // Is weekend
      
      // Test for weekday (Wednesday)
      const weekday = new Date('2025-09-03T15:00:00Z');
      const weekdayDay = getDayInTimeZone(weekday, 'America/New_York');
      expect(weekdayDay).toBe(3);
      expect(weekdayDay === 0 || weekdayDay === 6).toBe(false); // Not weekend
    });
  });
});
