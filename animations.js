// 2968149
export function initScrollAnimations() {
    const targets = document.querySelectorAll('.animate-on-scroll')
    if (!targets.length) return

    targets.forEach(el => {
        const delay = el.dataset.delay
        if (delay) el.style.transitionDelay = delay
    })

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible')
                observer.unobserve(entry.target)
            }
        })
    }, { threshold: 0.1 })

    targets.forEach(el => observer.observe(el))
}
