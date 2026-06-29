import type { Locale, NotificationType } from "@dentalos/core/constants";

export interface TemplateData {
  clinicName: string;
  patientName?: string;
  date?: string; // DD/MM/YYYY
  time?: string; // HH:mm
  providerName?: string;
  amount?: string; // formatted money
  link?: string;
}

export interface RenderedMessage {
  subject: string;
  sms: string;
  emailText: string;
}

type Localized = Record<Locale, (d: TemplateData) => RenderedMessage>;

const greeting = (locale: Locale, d: TemplateData) =>
  locale === "fr" ? `Bonjour ${d.patientName ?? ""}`.trim() : `Hi ${d.patientName ?? ""}`.trim();

const templates: Partial<Record<NotificationType, Localized>> = {
  appointment_booked: {
    en: (d) => ({
      subject: `Appointment confirmed — ${d.clinicName}`,
      sms: `${d.clinicName}: your appointment is booked for ${d.date} at ${d.time}${d.providerName ? ` with ${d.providerName}` : ""}. Reply C to confirm.`,
      emailText: `${greeting("en", d)},\n\nYour appointment at ${d.clinicName} is booked for ${d.date} at ${d.time}${d.providerName ? ` with ${d.providerName}` : ""}.\n\n${d.link ? `Manage your booking: ${d.link}\n\n` : ""}See you soon,\n${d.clinicName}`,
    }),
    fr: (d) => ({
      subject: `Rendez-vous confirmé — ${d.clinicName}`,
      sms: `${d.clinicName} : votre rendez-vous est réservé le ${d.date} à ${d.time}${d.providerName ? ` avec ${d.providerName}` : ""}. Répondez C pour confirmer.`,
      emailText: `${greeting("fr", d)},\n\nVotre rendez-vous à ${d.clinicName} est réservé le ${d.date} à ${d.time}${d.providerName ? ` avec ${d.providerName}` : ""}.\n\n${d.link ? `Gérer votre rendez-vous : ${d.link}\n\n` : ""}À bientôt,\n${d.clinicName}`,
    }),
  },
  appointment_confirmation_request: {
    en: (d) => ({
      subject: `Please confirm your appointment — ${d.clinicName}`,
      sms: `${d.clinicName}: please confirm your appointment on ${d.date} at ${d.time}. Reply C to confirm, N to cancel.`,
      emailText: `${greeting("en", d)},\n\nPlease confirm your appointment at ${d.clinicName} on ${d.date} at ${d.time}.\n${d.link ? `Confirm here: ${d.link}\n` : ""}`,
    }),
    fr: (d) => ({
      subject: `Veuillez confirmer votre rendez-vous — ${d.clinicName}`,
      sms: `${d.clinicName} : veuillez confirmer votre rendez-vous le ${d.date} à ${d.time}. Répondez C pour confirmer, N pour annuler.`,
      emailText: `${greeting("fr", d)},\n\nVeuillez confirmer votre rendez-vous à ${d.clinicName} le ${d.date} à ${d.time}.\n${d.link ? `Confirmer ici : ${d.link}\n` : ""}`,
    }),
  },
  appointment_reminder: {
    en: (d) => ({
      subject: `Reminder: appointment on ${d.date} — ${d.clinicName}`,
      sms: `Reminder from ${d.clinicName}: your appointment is on ${d.date} at ${d.time}${d.providerName ? ` with ${d.providerName}` : ""}. Reply C to confirm.`,
      emailText: `${greeting("en", d)},\n\nThis is a reminder that you have an appointment at ${d.clinicName} on ${d.date} at ${d.time}${d.providerName ? ` with ${d.providerName}` : ""}.\n${d.link ? `Manage: ${d.link}\n` : ""}`,
    }),
    fr: (d) => ({
      subject: `Rappel : rendez-vous le ${d.date} — ${d.clinicName}`,
      sms: `Rappel de ${d.clinicName} : votre rendez-vous est le ${d.date} à ${d.time}${d.providerName ? ` avec ${d.providerName}` : ""}. Répondez C pour confirmer.`,
      emailText: `${greeting("fr", d)},\n\nRappel : vous avez un rendez-vous à ${d.clinicName} le ${d.date} à ${d.time}${d.providerName ? ` avec ${d.providerName}` : ""}.\n${d.link ? `Gérer : ${d.link}\n` : ""}`,
    }),
  },
  appointment_cancelled: {
    en: (d) => ({
      subject: `Appointment cancelled — ${d.clinicName}`,
      sms: `${d.clinicName}: your appointment on ${d.date} at ${d.time} has been cancelled.`,
      emailText: `${greeting("en", d)},\n\nYour appointment at ${d.clinicName} on ${d.date} at ${d.time} has been cancelled.`,
    }),
    fr: (d) => ({
      subject: `Rendez-vous annulé — ${d.clinicName}`,
      sms: `${d.clinicName} : votre rendez-vous le ${d.date} à ${d.time} a été annulé.`,
      emailText: `${greeting("fr", d)},\n\nVotre rendez-vous à ${d.clinicName} le ${d.date} à ${d.time} a été annulé.`,
    }),
  },
  appointment_rescheduled: {
    en: (d) => ({
      subject: `Appointment rescheduled — ${d.clinicName}`,
      sms: `${d.clinicName}: your appointment has been moved to ${d.date} at ${d.time}${d.providerName ? ` with ${d.providerName}` : ""}. Reply C to confirm.`,
      emailText: `${greeting("en", d)},\n\nYour appointment at ${d.clinicName} has been rescheduled to ${d.date} at ${d.time}${d.providerName ? ` with ${d.providerName}` : ""}.\n${d.link ? `Manage: ${d.link}\n` : ""}`,
    }),
    fr: (d) => ({
      subject: `Rendez-vous reprogrammé — ${d.clinicName}`,
      sms: `${d.clinicName} : votre rendez-vous a été déplacé au ${d.date} à ${d.time}${d.providerName ? ` avec ${d.providerName}` : ""}. Répondez C pour confirmer.`,
      emailText: `${greeting("fr", d)},\n\nVotre rendez-vous à ${d.clinicName} a été reprogrammé au ${d.date} à ${d.time}${d.providerName ? ` avec ${d.providerName}` : ""}.\n${d.link ? `Gérer : ${d.link}\n` : ""}`,
    }),
  },
  payment_due: {
    en: (d) => ({
      subject: `Payment reminder — ${d.clinicName}`,
      sms: `${d.clinicName}: you have an outstanding balance of ${d.amount}. Pay online: ${d.link ?? ""}`,
      emailText: `${greeting("en", d)},\n\nYou have an outstanding balance of ${d.amount} at ${d.clinicName}.\n${d.link ? `Pay online: ${d.link}\n` : ""}`,
    }),
    fr: (d) => ({
      subject: `Rappel de paiement — ${d.clinicName}`,
      sms: `${d.clinicName} : vous avez un solde impayé de ${d.amount}. Payez en ligne : ${d.link ?? ""}`,
      emailText: `${greeting("fr", d)},\n\nVous avez un solde impayé de ${d.amount} à ${d.clinicName}.\n${d.link ? `Payez en ligne : ${d.link}\n` : ""}`,
    }),
  },
  recall_due: {
    en: (d) => ({
      subject: `Time for your check-up — ${d.clinicName}`,
      sms: `${d.clinicName}: you're due for a check-up. Book online: ${d.link ?? ""}`,
      emailText: `${greeting("en", d)},\n\nIt's time for your dental check-up at ${d.clinicName}.\n${d.link ? `Book online: ${d.link}\n` : ""}`,
    }),
    fr: (d) => ({
      subject: `C'est l'heure de votre contrôle — ${d.clinicName}`,
      sms: `${d.clinicName} : il est temps pour votre contrôle. Réservez en ligne : ${d.link ?? ""}`,
      emailText: `${greeting("fr", d)},\n\nIl est temps pour votre contrôle dentaire à ${d.clinicName}.\n${d.link ? `Réservez en ligne : ${d.link}\n` : ""}`,
    }),
  },
  treatment_plan_shared: {
    en: (d) => ({
      subject: `Your treatment plan — ${d.clinicName}`,
      sms: `${d.clinicName}: your dentist has shared a treatment plan${d.amount ? ` (${d.amount})` : ""}. Review & accept online: ${d.link ?? ""}`,
      emailText: `${greeting("en", d)},\n\n${d.clinicName} has prepared a treatment plan for you${d.amount ? `, totalling ${d.amount}` : ""}.\n${d.link ? `Review and accept it here: ${d.link}\n` : ""}`,
    }),
    fr: (d) => ({
      subject: `Votre plan de traitement — ${d.clinicName}`,
      sms: `${d.clinicName} : votre dentiste a partagé un plan de traitement${d.amount ? ` (${d.amount})` : ""}. Consultez et acceptez en ligne : ${d.link ?? ""}`,
      emailText: `${greeting("fr", d)},\n\n${d.clinicName} a préparé un plan de traitement pour vous${d.amount ? `, d'un montant de ${d.amount}` : ""}.\n${d.link ? `Consultez et acceptez-le ici : ${d.link}\n` : ""}`,
    }),
  },
  payment_receipt: {
    en: (d) => ({
      subject: `Payment received — ${d.clinicName}`,
      sms: `${d.clinicName}: we received your payment of ${d.amount}. Thank you!`,
      emailText: `${greeting("en", d)},\n\nWe've received your payment of ${d.amount} at ${d.clinicName}. Thank you!`,
    }),
    fr: (d) => ({
      subject: `Paiement reçu — ${d.clinicName}`,
      sms: `${d.clinicName} : nous avons reçu votre paiement de ${d.amount}. Merci !`,
      emailText: `${greeting("fr", d)},\n\nNous avons reçu votre paiement de ${d.amount} à ${d.clinicName}. Merci !`,
    }),
  },
};

export function renderMessage(type: NotificationType, locale: Locale, data: TemplateData): RenderedMessage {
  const t = templates[type]?.[locale] ?? templates[type]?.en;
  if (t) return t(data);
  // Generic fallback.
  return {
    subject: data.clinicName,
    sms: `${data.clinicName}: you have a new notification.`,
    emailText: `${greeting(locale, data)},\n\nYou have a new notification from ${data.clinicName}.`,
  };
}
