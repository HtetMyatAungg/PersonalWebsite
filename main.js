import { initScrollAnimations } from './animations.js'
initScrollAnimations()

const hire = document.getElementById("hire-me")
hire.style.backgroundColor = "#534AB7"
hire.style.borderRadius = "5px"
hire.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/henry-htet-myat-aung", "_blank", "noopener,noreferrer")
})

const cvButton = document.getElementsByClassName("CVButton")[0]
if (cvButton) {
    cvButton.addEventListener("click", function() {
        window.open("https://drive.google.com/file/d/1tNIIzy2EEJLrQmY5vVeA6g-D5DPx3gwR/view?usp=drive_link", "_blank", "noopener,noreferrer")
    })
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function(e) {
        const target = document.querySelector(this.getAttribute("href"))
        if (target) {
            e.preventDefault()
            target.scrollIntoView({ behavior: "smooth" })
        }
    })
})
