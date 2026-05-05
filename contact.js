import { initScrollAnimations } from './animations.js'
initScrollAnimations()

const hire = document.getElementById("hire-me")
hire.style.backgroundColor = "#534AB7"
hire.style.borderRadius = "5px"
hire.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/htet-myat-aung-4a370932a/", "_blank", "noopener,noreferrer")
})

const form = document.getElementById("contact-form")
const successMsg = document.getElementById("form-success")

function showError(fieldId, message) {
    const el = document.getElementById(fieldId + "-error")
    const input = document.getElementById(fieldId)
    if (el) el.textContent = message
    if (input) input.classList.add("input-error")
}

function clearErrors() {
    document.querySelectorAll(".form-error").forEach(el => el.textContent = "")
    document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"))
    successMsg.style.display = "none"
}

form.addEventListener("submit", function(e) {
    e.preventDefault()
    clearErrors()

    const name = document.getElementById("fname").value.trim()
    const email = document.getElementById("femail").value.trim()
    const subject = document.getElementById("fsubject").value
    const message = document.getElementById("fmessage").value.trim()
    let valid = true

    if (!name) {
        showError("fname", "Name is required.")
        valid = false
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("femail", "Please enter a valid email address.")
        valid = false
    }

    if (!subject) {
        showError("fsubject", "Please select a subject.")
        valid = false
    }

    if (message.length < 10) {
        showError("fmessage", "Message must be at least 10 characters.")
        valid = false
    }

    if (valid) {
        successMsg.style.display = "block"
        form.reset()
    }
})

document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", function() {
        const errEl = document.getElementById(el.id + "-error")
        if (errEl) errEl.textContent = ""
        el.classList.remove("input-error")
    })
})
