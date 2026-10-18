# Adding a blog post

1. Copy `blog/_post-template.html` to `blog/your-post-name.html` (lowercase, words separated by hyphens).
2. In the new file, change: the `<title>`, the meta description (under 155 characters), the three `your-post-name` URLs
   (canonical, og:url, structured data), the date, headline and description in the Article block, and the article text.
3. Put a card for it at the top of the grid in `blog.html` (the card HTML is in a comment there) — give it a `.blog-card-media` thumbnail (16:9, e.g. 640×360) plus the `.blog-card-body` text block.
4. The first time: delete the "blog-empty" block in `blog.html`, remove `noindex` from its head, and add
   `https://micronode.in/blog.html` to `sitemap.xml`.
5. Add each new post's URL to `sitemap.xml`, then request indexing in Google Search Console.

Paths inside `blog/` start with `../` because the folder is one level down. Keep that if you copy by hand.
