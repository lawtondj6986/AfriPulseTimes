"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { privacyNote, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const OTHER_MATTER = "Other / Not sure";

interface FormValues {
  name: string;
  phone: string;
  email: string;
  matter: string;
  message: string;
  consent: boolean;
  /** Honeypot — humans never see or fill this. */
  company: string;
}

type FieldErrors = Partial<Record<"name" | "phone" | "email" | "message" | "consent", string>>;

type Status = "idle" | "submitting" | "success" | "error";

const initialValues: FormValues = {
  name: "",
  phone: "",
  email: "",
  matter: OTHER_MATTER,
  message: "",
  consent: false,
  company: "",
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "Please enter your full name.";
  if (!values.phone.trim()) errors.phone = "Please enter a phone number where we can reach you.";
  if (!values.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (!values.message.trim()) errors.message = "Please tell us briefly how we can help.";
  if (!values.consent) errors.consent = "Please confirm you understand before submitting.";
  return errors;
}

export function ContactForm() {
  const [values, setValues] = React.useState<FormValues>(initialValues);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [status, setStatus] = React.useState<Status>("idle");

  const matterOptions = React.useMemo(
    () => [...siteConfig.practiceAreas.map((area) => area.title), OTHER_MATTER],
    []
  );

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FieldErrors];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Honeypot: silently "succeed" for bots without sending anything.
    if (values.company.trim() !== "") {
      setStatus("success");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          matter: values.matter,
          message: values.message.trim(),
          company: values.company,
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-lg border border-gold/40 bg-navy px-8 py-12 text-center shadow-md"
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15"
          aria-hidden="true"
        >
          <CheckCircle2 className="h-8 w-8 text-gold" />
        </span>
        <h3 className="font-serif text-2xl font-semibold text-cream">
          Thank you — your request has been received.
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-cream/80">
          We will review your message and get back to you promptly. If your matter
          is urgent, please call{" "}
          <a
            href={siteConfig.phoneHref}
            className="font-semibold text-gold underline-offset-4 hover:underline"
          >
            {siteConfig.phone}
          </a>{" "}
          now.
        </p>
      </div>
    );
  }

  const isSubmitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot field — hidden from humans, tempting to bots. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          type="text"
          id="contact-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={values.company}
          onChange={(event) => setField("company", event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">
            Full Name <span className="text-gold-dark" aria-hidden="true">*</span>
          </Label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            placeholder="Jane Doe"
          />
          {errors.name && (
            <p id="contact-name-error" className="text-xs font-medium text-red-700">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">
            Phone <span className="text-gold-dark" aria-hidden="true">*</span>
          </Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={values.phone}
            onChange={(event) => setField("phone", event.target.value)}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            placeholder="(555) 555-5555"
          />
          {errors.phone && (
            <p id="contact-phone-error" className="text-xs font-medium text-red-700">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email">
          Email <span className="text-gold-dark" aria-hidden="true">*</span>
        </Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(event) => setField("email", event.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p id="contact-email-error" className="text-xs font-medium text-red-700">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-matter">What can we help you with?</Label>
        <select
          id="contact-matter"
          name="matter"
          value={values.matter}
          onChange={(event) => setField("matter", event.target.value)}
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-navy/20 bg-white px-4 py-2 text-sm text-charcoal shadow-sm transition-colors",
            "focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {matterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">
          Message <span className="text-gold-dark" aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          value={values.message}
          onChange={(event) => setField("message", event.target.value)}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          placeholder="Briefly describe your situation. Please do not include confidential case details."
        />
        {errors.message && (
          <p id="contact-message-error" className="text-xs font-medium text-red-700">
            {errors.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="contact-consent"
            name="consent"
            required
            checked={values.consent}
            onChange={(event) => setField("consent", event.target.checked)}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "contact-consent-error" : "contact-consent-note"}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2"
          />
          <Label
            htmlFor="contact-consent"
            className="cursor-pointer text-xs font-normal leading-relaxed text-charcoal/80"
          >
            I understand that submitting this form does not create an attorney-client
            relationship, and that I should not send confidential or sensitive
            information. <span id="contact-consent-note">{privacyNote}</span>{" "}
            <span className="text-gold-dark" aria-hidden="true">*</span>
          </Label>
        </div>
        {errors.consent && (
          <p id="contact-consent-error" className="text-xs font-medium text-red-700">
            {errors.consent}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          "Request My Free Consultation"
        )}
      </Button>

      <div aria-live="polite" role="status">
        {status === "error" && (
          <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
            Something went wrong and your message was not sent. Please try again, or
            call us directly at{" "}
            <a
              href={siteConfig.phoneHref}
              className="font-semibold underline underline-offset-2"
            >
              {siteConfig.phone}
            </a>
            .
          </p>
        )}
      </div>
    </form>
  );
}

export default ContactForm;
