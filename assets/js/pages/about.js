/**
 * about.js — entry module for about.html.
 * Renders the grouped skills table from config so the list lives in one place.
 */

import "../site.js";
import { skillGroups } from "../config.js";

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
