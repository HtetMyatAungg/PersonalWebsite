const navLinks = {
    about: document.getElementsByClassName("About")[0],
    projects: document.getElementsByClassName("Projects")[0],
    experience: document.getElementsByClassName("Experience")[0],
    skills: document.getElementsByClassName("Skills")[0],
    contact: document.getElementsByClassName("Contact")[0],
}

function setActiveNav(active) {
    Object.values(navLinks).forEach(el => { if (el) el.style.color = "gray" })
    if (active) active.style.color = "white"
}

const sectionIds = {
    about: "about",
    projects: "projects",
    experience: "experience",
    skills: "skills",
    contact: "contact",
}

Object.entries(navLinks).forEach(([key, el]) => {
    if (!el) return
    el.addEventListener("click", function(e) {
        e.preventDefault()
        setActiveNav(el)
        const target = document.getElementById(sectionIds[key])
        if (target) target.scrollIntoView({ behavior: "smooth" })
    })
})

const hire = document.getElementById("hire-me")
hire.style.backgroundColor = "#534AB7"
hire.style.borderRadius = "5px"
hire.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/htet-myat-aung-4a370932a/", "_blank", "noopener,noreferrer")
})

// "View Projects" scrolls to the projects section on the page
const projectButton = document.getElementsByClassName("ProjectButton")[0]
projectButton.addEventListener("click", function() {
    setActiveNav(navLinks.projects)
    document.getElementById("projects").scrollIntoView({ behavior: "smooth" })
})

const cvButton = document.getElementsByClassName("CVButton")[0]
cvButton.addEventListener("click", function() {
    window.open("https://drive.google.com/file/d/1vX0FUemX7igfGN29Lf-QfLNFq5MMTZrH/view?usp=drive_link", "_blank", "noopener,noreferrer")
})

// Hero "Get in Touch" scrolls to contact section
const contactHeroButton = document.getElementsByClassName("ContactButton")[0]
if (contactHeroButton) {
    contactHeroButton.addEventListener("click", function() {
        setActiveNav(navLinks.contact)
        document.getElementById("contact").scrollIntoView({ behavior: "smooth" })
    })
}

// ── Project filter tabs ──
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"))
        btn.classList.add("active")

        const filter = btn.dataset.filter
        document.querySelectorAll(".pcard").forEach(card => {
            if (filter === "all") {
                card.classList.remove("hidden")
            } else {
                const cats = card.dataset.category || ""
                card.classList.toggle("hidden", !cats.split(" ").includes(filter))
            }
        })
    })
})
