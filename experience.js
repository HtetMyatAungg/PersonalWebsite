import { initScrollAnimations } from './animations.js'
initScrollAnimations()

const hire = document.getElementById("hire-me")
hire.style.backgroundColor = "#534AB7"
hire.style.borderRadius = "5px"
hire.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/htet-myat-aung-4a370932a/", "_blank", "noopener,noreferrer")
})
