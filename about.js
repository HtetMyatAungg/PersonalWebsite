// 2968149
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
        window.open("https://drive.google.com/file/d/1vX0FUemX7igfGN29Lf-QfLNFq5MMTZrH/view?usp=drive_link", "_blank", "noopener,noreferrer")
    })
}
