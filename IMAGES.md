# Images for Clyra

I cannot generate images, so use any AI image tool you already have (Gemini, Bing Image Creator, Adobe Firefly, Canva, Leonardo, ChatGPT images). Generate one image per category, then name the files exactly as below and put them in `client/public/images/events/`.

## Rules
- Landscape 16:9, about 1600 x 900.
- No text, no logos, no brand names, no recognisable real people. AI tools mangle text, and the card already shows the title.
- Compress each to under 300 KB (squoosh.app, JPG quality 75). Save as `.jpg`.
- Add a note in your README that sample images are AI-generated.

## Style line (paste at the end of every prompt)
`editorial poster style, bold flat shapes, acid lime and vermilion accents on an off-white and near-black palette, grainy print texture, high contrast, no text, no logos, 16:9`

## One prompt per file
| File name | Prompt |
|---|---|
| `technology-hackathons.jpg` | Students collaborating around laptops late at night at a hackathon, glowing screens, energy drinks, whiteboard with sketches |
| `live-music-concerts.jpg` | A crowd with raised hands in front of a stage with bright stage lights, silhouette of a guitarist |
| `business-startups.jpg` | A young founder pitching on a small stage to an audience, a simple slide behind, warm spotlight |
| `sports-tournaments.jpg` | A football player mid-kick on a floodlit pitch at dusk, motion blur, dramatic sky |
| `creative-arts-culture.jpg` | Dancers in colourful costumes on a stage with dramatic lighting, motion trails |
| `workshops-career.jpg` | A workshop table with laptops, circuit boards and notebooks, hands working on a project, overhead view |
| `campus-socials.jpg` | Friends laughing together on a campus lawn at golden hour, string lights, snacks |

## Other images
| File | Where it appears | Prompt |
|---|---|---|
| `auth-side.jpg` (in `client/public/images/`) | Sign-in page, right side | A glowing ticket stub floating above a crowd at an event, abstract, dramatic lighting, portrait-friendly composition |

Then run `node src/seedShowcase.js` again in `server`. It attaches each poster to the matching events. Posters you add to events later through the organizer form are not affected.
