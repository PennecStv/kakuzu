import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Reminder } from '../lib/goals';

/** Only the Android app can schedule a notification: a web page cannot wake up once closed. */
export const canNotify = Capacitor.isNativePlatform();

/** Asks for the permission, once; Android remembers the answer. */
export async function allowNotifications(): Promise<boolean> {
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

/** Replaces every scheduled notification with `reminders`. */
export async function scheduleReminders(reminders: Reminder[]): Promise<void> {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length > 0) await LocalNotifications.cancel({ notifications: notifications.map(({ id }) => ({ id })) });
  // schedule() would ask for the permission itself: never out of the blue, only from the switch.
  if (reminders.length === 0 || (await LocalNotifications.checkPermissions()).display !== 'granted') return;
  await LocalNotifications.schedule({
    notifications: reminders.map(({ id, at, title, body }) => ({
      id,
      title,
      body,
      schedule: { at, allowWhileIdle: true },
      // A reminder can come a few minutes late; an exact one would send the user to the alarm settings.
      isExactNotification: false,
    })),
  });
}
