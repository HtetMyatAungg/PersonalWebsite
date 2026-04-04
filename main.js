const hire = document.getElementById("hire-me")
hire.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/htet-myat-aung-4a370932a/", "_blank", "noopener,noreferrer");})
hire.style.backgroundColor = "#534AB7"
hire.style.borderRadius = "5px"

const about = document.getElementsByClassName("About")[0]
about.addEventListener("click", function() {
    projects.style.color = "gray"
    experience.style.color = "gray"
    skills.style.color = "gray"
    about.style.color = "white"})

const projects = document.getElementsByClassName("Projects")[0]
projects.addEventListener("click", function() {
    about.style.color = "gray"
    experience.style.color = "gray"
    skills.style.color = "gray"
    projects.style.color = "white"})

const skills = document.getElementsByClassName("Skills")[0]
skills.addEventListener("click", function() {
    about.style.color = "gray"
    projects.style.color = "gray"
    experience.style.color = "gray"
    skills.style.color = "white"})

const experience = document.getElementsByClassName("Experience")[0]
experience.addEventListener("click", function() {
    about.style.color = "gray"
    projects.style.color = "gray"
    skills.style.color = "gray"
    experience.style.color = "white"})

const buttons = document.getElementsByClassName("ProjectButton")[0]
buttons.addEventListener("click", function() {
    window.open("https://github.com/htetmyataungg", "_blank", "noopener,noreferrer");})

const cvButton = document.getElementsByClassName("CVButton")[0]
cvButton.addEventListener("click", function() {
    window.open("https://drive.google.com/file/d/1vX0FUemX7igfGN29Lf-QfLNFq5MMTZrH/view?usp=drive_link", "_blank", "noopener,noreferrer");})

const contactButton = document.getElementsByClassName("contact-me")[0]
contactButton.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/htet-myat-aung-4a370932a/", "_blank", "noopener,noreferrer");})