import React from "react";

export const Footer: React.FC = () => (
  <div className="flex h-10 w-full items-center justify-center">
    <p className="text-sm">Designed with love by</p>
    <a
      href="https://fung.studio/"
      target="_blank"
      rel="noreferrer"
      className="ml-1 text-sm"
    >
      Max Fung.
    </a>
    <a
      href="https://ko-fi.com/maxfung"
      target="_blank"
      rel="noreferrer"
      className="text-foreground-muted ml-1 text-sm"
    >
      Support on ko-fi.
    </a>
  </div>
);

export default Footer;
