/**
 * about.js — entry module for about.html.
 *
 * The about page carries two pieces of behaviour: the grouped skills table,
 * rendered from config so the list lives in one place, and the contact form at
 * the foot of the page (contact is a section here, not a page of its own).
 */

import "../site.js";
import { skillGroups } from "../config.js";
import { initContactForm } from "../modules/contact-form.js";

const mount = document.querySelector("[data-skill-groups]");

if (mount) {
    mount.innerHTML = skillGroups
        .map(
            (group) => `
        <div class="skill-group">
            <h3 class="skill-group__name">${group.name}</h3>
            <div class="tag-list">
                ${group.items.map((item) => `<span class="tag">${item}</span>`).join("")}
            </div>
        </div>`
        )
        .join("");
}

initContactForm();
