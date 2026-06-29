export { renderMessage, type TemplateData, type RenderedMessage } from "./templates";
export {
  createNotifications,
  dispatchNotification,
  dispatchDueNotifications,
  listPatientNotifications,
  markNotificationRead,
  type CreateNotificationInput,
} from "./service";
export {
  sendBookingConfirmation,
  scheduleAppointmentReminders,
  type AppointmentNotifyContext,
} from "./scheduler";
export { enqueueDueRecalls } from "./recall";
