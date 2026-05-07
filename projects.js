import { initScrollAnimations } from './animations.js'
initScrollAnimations()

const hire = document.getElementById("hire-me")
hire.style.backgroundColor = "#534AB7"
hire.style.borderRadius = "5px"
hire.addEventListener("click", function() {
    window.open("https://www.linkedin.com/in/htet-myat-aung-4a370932a/", "_blank", "noopener,noreferrer")
})

document.querySelector('video').playbackRate = 1.5;

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

const video = document.getElementById("myanpay-video")
const placeholder = document.getElementById("video-placeholder")

if (video && placeholder) {
    video.addEventListener("loadeddata", () => {
        placeholder.style.display = "none"
        video.style.display = "block"
    })
    video.addEventListener("error", () => {
        video.style.display = "none"
        placeholder.style.display = "flex"
    })
    video.style.display = "none"
    placeholder.style.display = "flex"
}
