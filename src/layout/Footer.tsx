import { Heart } from "lucide-react";

export const Footer: React.FC = () => (
  <div className="text-foreground-emphasis flex h-10 w-full items-center justify-center">
    <p className="text-sm">
      Made with{" "}
      <Heart
        fill="currentColor"
        className="inline-block h-3 w-3 -translate-y-0.5"
      />{" "}
      by
    </p>
    <a
      href="https://fung.studio/"
      target="_blank"
      rel="noreferrer"
      className="ml-1 text-sm"
    >
      Max Fung.
    </a>
  </div>
);

export default Footer;
