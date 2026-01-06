import artwork1 from "@/assets/artwork-1.jpg";
import artwork2 from "@/assets/artwork-2.jpg";
import artwork3 from "@/assets/artwork-3.jpg";
import artwork4 from "@/assets/artwork-4.jpg";
import artwork5 from "@/assets/artwork-5.jpg";
import artwork6 from "@/assets/artwork-6.jpg";

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  image: string;
  price: number;
  medium: string;
  category: "traditional" | "digital";
  type: "original" | "commission";
  isVerified: boolean;
  description?: string;
  tools?: string[];
  dimensions?: string;
  year?: number;
}

export interface Artist {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  tools: string[];
  badges: string[];
  artworks: string[];
  isTraditional: boolean;
}

export const artworks: Artwork[] = [
  {
    id: "1",
    title: "Flowing Dreams",
    artist: "Elena Vasquez",
    artistId: "elena-vasquez",
    image: artwork1,
    price: 2400,
    medium: "Watercolor on Paper",
    category: "traditional",
    type: "original",
    isVerified: true,
    description: "An abstract exploration of color and form, created using traditional watercolor techniques on cold-pressed paper.",
    tools: ["Watercolor", "Cold-pressed paper", "Sable brushes"],
    dimensions: "24 × 30 inches",
    year: 2025,
  },
  {
    id: "2",
    title: "Wisdom in Lines",
    artist: "Marcus Chen",
    artistId: "marcus-chen",
    image: artwork2,
    price: 1800,
    medium: "Graphite on Paper",
    category: "traditional",
    type: "original",
    isVerified: true,
    description: "A detailed pencil portrait capturing the depth and character of age, created through hours of careful observation and rendering.",
    tools: ["Graphite pencils", "Bristol paper", "Blending stumps"],
    dimensions: "18 × 24 inches",
    year: 2025,
  },
  {
    id: "3",
    title: "Mediterranean Light",
    artist: "Sofia Romano",
    artistId: "sofia-romano",
    image: artwork3,
    price: 4500,
    medium: "Oil on Canvas",
    category: "traditional",
    type: "original",
    isVerified: true,
    description: "A vibrant oil painting capturing the warmth and color of a Mediterranean coastal village, using bold impasto technique.",
    tools: ["Oil paints", "Linen canvas", "Palette knives"],
    dimensions: "36 × 48 inches",
    year: 2024,
  },
  {
    id: "4",
    title: "Bamboo Serenity",
    artist: "Hiroshi Tanaka",
    artistId: "hiroshi-tanaka",
    image: artwork4,
    price: 3200,
    medium: "Ink on Rice Paper",
    category: "traditional",
    type: "original",
    isVerified: true,
    description: "A contemplative ink wash painting in the traditional East Asian style, capturing the essence of bamboo and birds.",
    tools: ["Sumi ink", "Rice paper", "Calligraphy brushes"],
    dimensions: "20 × 28 inches",
    year: 2025,
  },
  {
    id: "5",
    title: "Enchanted Forest",
    artist: "Luna Storm",
    artistId: "luna-storm",
    image: artwork5,
    price: 1200,
    medium: "Digital Painting",
    category: "digital",
    type: "commission",
    isVerified: true,
    description: "A mystical digital painting created entirely by hand using Procreate, featuring a magical forest scene with glowing fireflies.",
    tools: ["iPad Pro", "Procreate", "Apple Pencil"],
    dimensions: "4000 × 3200 pixels",
    year: 2025,
  },
  {
    id: "6",
    title: "Dance of Light",
    artist: "Isabella Noir",
    artistId: "isabella-noir",
    image: artwork6,
    price: 2800,
    medium: "Charcoal on Paper",
    category: "traditional",
    type: "original",
    isVerified: true,
    description: "An expressive charcoal drawing capturing the grace and movement of a ballerina, with dramatic gestural lines.",
    tools: ["Charcoal sticks", "Toned paper", "Kneaded eraser"],
    dimensions: "22 × 30 inches",
    year: 2024,
  },
];

export const artists: Artist[] = [
  {
    id: "elena-vasquez",
    name: "Elena Vasquez",
    avatar: artwork1,
    bio: "Contemporary watercolor artist exploring the boundaries between abstraction and emotion. Based in Barcelona, Spain.",
    tools: ["Watercolor", "Gouache", "Ink"],
    badges: ["Human Verified", "Traditional Artist"],
    artworks: ["1"],
    isTraditional: true,
  },
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    avatar: artwork2,
    bio: "Portrait artist specializing in hyperrealistic graphite drawings. Every piece takes 40-100 hours of dedicated work.",
    tools: ["Graphite", "Charcoal", "Colored Pencils"],
    badges: ["Human Verified", "Traditional Artist"],
    artworks: ["2"],
    isTraditional: true,
  },
  {
    id: "sofia-romano",
    name: "Sofia Romano",
    avatar: artwork3,
    bio: "Oil painter capturing Mediterranean landscapes and seascapes. Inspired by the Impressionists and Fauvist movements.",
    tools: ["Oil", "Acrylic", "Palette Knives"],
    badges: ["Human Verified", "Traditional Artist"],
    artworks: ["3"],
    isTraditional: true,
  },
  {
    id: "luna-storm",
    name: "Luna Storm",
    avatar: artwork5,
    bio: "Digital artist creating fantasy and nature-inspired illustrations. All work is hand-drawn with no AI assistance.",
    tools: ["Procreate", "Photoshop", "Clip Studio Paint"],
    badges: ["Human Verified", "Digital Artist"],
    artworks: ["5"],
    isTraditional: false,
  },
];

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find((a) => a.id === id);
}

export function getArtistById(id: string): Artist | undefined {
  return artists.find((a) => a.id === id);
}

export function getArtworksByArtist(artistId: string): Artwork[] {
  return artworks.filter((a) => a.artistId === artistId);
}
