/**
 * config.js — every piece of site-wide data lives here and nowhere else.
 *
 * If you need to change a link, a nav label, or a service key, this is the
 * only file to touch. No other module hard-codes a URL or an email address.
 */

export const site = {
    name: "Htet Myat Aung",
    shortName: "HMA",
    role: "AI Researcher",
    tagline: "Mechanistic interpretability & neurosymbolic AI",
    location: "Egham, Surrey, UK",
    domain: "htetmyataung.uk",
    availability: "Open to research collaborations & Summer 2027 internships",
};

export const links = {
    email: "henry.htetmyataung@gmail.com",
    github: "https://github.com/HtetMyatAungg",
    linkedin: "https://www.linkedin.com/in/henry-htet-myat-aung",
    /* Single canonical CV link, served from this repository rather than Google
       Drive: the URL cannot rot, the file is versioned alongside the site, and
       the download lands in someone's folder already named after you.
       To publish a new CV, overwrite HtetMyatAung-CV.pdf and commit. */
    cv: "HtetMyatAung-CV.pdf",
    lab: "https://dicelab-rhul.github.io/autoformalisation/",
    repo: "https://github.com/HtetMyatAungg/PersonalWebsite",
};

/**
 * Primary navigation. Order here is the order rendered.
 *
 * Four destinations, deliberately. Home is reached by the brand in the header
 * (the universal convention, so a "Home" item only adds noise), and contact
 * lives at the foot of the about page rather than on a page of its own — a
 * visitor who wants to reach you is already reading about you.
 */
export const nav = [
    { label: "Research", href: "research.html" },
    { label: "Projects", href: "projects.html" },
    { label: "Writing", href: "blog.html" },
    { label: "About", href: "about.html" },
];

/**
 * Footer link columns.
 *
 * The footer deliberately does NOT repeat the nav: with four destinations in a
 * sticky header, a second copy down here is just more to read. What belongs at
 * the bottom of a page is the way out of the site — profiles and the CV.
 */
export const footerColumns = [
    {
        title: "Elsewhere",
        links: [
            { label: "GitHub", href: links.github, newTab: true },
            { label: "LinkedIn", href: links.linkedin, newTab: true },
            { label: "DICE Lab catalogue", href: links.lab, newTab: true },
        ],
    },
    {
        title: "Contact",
        links: [
            { label: links.email, href: `mailto:${links.email}` },
            { label: "Download CV", href: links.cv, newTab: true },
        ],
    },
];

/** Contact form delivery (EmailJS). Public key is safe to expose. */
export const emailService = {
    publicKey: "nsIpqmNQ9xP_cO3Tr",
    serviceId: "service_jybbfn6",
    templateId: "template_xp24e3c",
};

/**
 * Blog comments.
 *
 * `provider` selects the backend; the available names are the keys registered
 * in assets/js/modules/comments/index.js. Everything below it is that
 * provider's own configuration.
 *
 * giscus stores each thread as a GitHub Discussion on this repository.
 * `repoId` is the repository's GraphQL node ID (already filled in).
 * `categoryId` comes from https://giscus.app once Discussions is enabled and
 * the giscus app is installed — run `npm run check:comments` for the current
 * status and the exact remaining steps.
 */
export const comments = {
    provider: "giscus",

    repo: "HtetMyatAungg/PersonalWebsite",
    repoId: "R_kgDOR5KqEw",
    category: "Announcements",
    categoryId: "DIC_kwDOR5KqE84DC96l",
    /** "pathname" gives one discussion thread per post URL. */
    mapping: "pathname",
    lang: "en",
};

/** Skills ticker on the home page, grouped for the about page. */
export const skillGroups = [
    {
        name: "Languages",
        items: ["Python", "Prolog (SWI)", "TypeScript", "JavaScript", "Java", "LaTeX"],
    },
    {
        name: "ML & research",
        items: ["PyTorch", "NumPy", "pandas", "scikit-learn", "matplotlib"],
    },
    {
        name: "Methods",
        items: [
            "Experiment design",
            "Evaluation harnesses",
            "Autoformalization",
            "Symbolic evaluation",
            "Prompt-condition sweeps",
        ],
    },
    {
        name: "LLM pipelines",
        items: ["Anthropic", "OpenAI", "DeepSeek", "Open-weight models"],
    },
    {
        name: "Tools",
        items: ["Git", "GitHub Actions", "Linux", "Cloudflare Workers", "Docker"],
    },
];
