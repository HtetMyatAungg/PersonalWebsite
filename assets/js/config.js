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

/** Primary navigation. Order here is the order rendered. */
export const nav = [
    { label: "Home", href: "index.html" },
    { label: "About", href: "about.html" },
    { label: "Research", href: "research.html" },
    { label: "Projects", href: "projects.html" },
    { label: "Writing", href: "blog.html" },
    { label: "Contact", href: "contact.html" },
];

/** Footer link columns. */
export const footerColumns = [
    {
        title: "Site",
        links: [
            { label: "About", href: "about.html" },
            { label: "Research", href: "research.html" },
            { label: "Projects", href: "projects.html" },
            { label: "Writing", href: "blog.html" },
        ],
    },
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
            { label: "Contact form", href: "contact.html" },
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
 * Blog comments, backed by GitHub Discussions through giscus.
 *
 * repoId and categoryId are issued by https://giscus.app — paste them in and
 * comments go live. Until then the post page shows a graceful fallback that
 * points readers at GitHub Discussions and email. See DESIGN.md → Comments.
 */
export const comments = {
    repo: "HtetMyatAungg/PersonalWebsite",
    repoId: "",
    category: "Blog comments",
    categoryId: "",
    /** "pathname" maps one discussion thread per post URL. */
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
