/**
 * contact-form.js — client-side validation plus delivery through EmailJS,
 * which lets a static site send mail without a backend. Keys live in config.js.
 *
 * This is a module rather than a page entry because the form is no longer a
 * page of its own: it sits at the foot of about.html. The page that mounts it
 * must load the EmailJS browser SDK before its own entry module, so
 * `window.emailjs` exists by the time anyone can submit.
 *
 * Markup contract — the form and its status line, by id:
 *
 *   <form id="contact-form"> with fields named name, email, subject, message
 *   <span data-error-for="<field>"> beside each field
 *   <p id="form-status">
 *
 * No-ops when the form is absent, so it is safe to call from a shared entry.
 */

import { emailService, links } from "../config.js";

/* Each rule returns an error string, or "" when the value is acceptable. */
const rules = {
    name: (value) => (value ? "" : "Please tell me your name."),
    email: (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "That does not look like an email address.",
    subject: (value) => (value ? "" : "Please choose a subject."),
    message: (value) => (value.length >= 10 ? "" : "A little more detail, please (10+ characters)."),
};

export function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const status = document.getElementById("form-status");

    function fieldElements(name) {
        const control = form.elements[name];
        return { control, error: document.querySelector(`[data-error-for="${name}"]`) };
    }

    function setError(name, message) {
        const { control, error } = fieldElements(name);
        if (error) error.textContent = message;
        if (control) control.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function showStatus(message, kind) {
        if (!status) return;
        status.textContent = message;
        status.className = `form-status form-status--${kind}`;
        status.hidden = false;
    }

    /** @returns {object|null} field values, or null when validation failed */
    function collect() {
        const values = {
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            subject: form.elements.subject.value,
            message: form.elements.message.value.trim(),
        };

        let firstInvalid = null;

        Object.entries(values).forEach(([field, value]) => {
            const message = rules[field](value);
            setError(field, message);
            if (message && !firstInvalid) firstInvalid = field;
        });

        if (firstInvalid) {
            fieldElements(firstInvalid).control?.focus();
            return null;
        }
        return values;
    }

    /* Clear a field's error as soon as the visitor starts fixing it. */
    form.addEventListener("input", (event) => {
        if (event.target.name) setError(event.target.name, "");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (status) status.hidden = true;

        const values = collect();
        if (!values) return;

        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        submit.textContent = "Sending…";

        try {
            if (!window.emailjs) throw new Error("Mail service unavailable");

            window.emailjs.init({ publicKey: emailService.publicKey });
            await window.emailjs.send(emailService.serviceId, emailService.templateId, {
                from_name: values.name,
                from_email: values.email,
                subject: values.subject,
                message: values.message,
            });

            showStatus("Thanks — message received. I usually reply within 24 hours.", "ok");
            form.reset();
        } catch {
            showStatus(`Something went wrong. Please email me directly at ${links.email}.`, "error");
        } finally {
            submit.disabled = false;
            submit.textContent = "Send message";
        }
    });
}
