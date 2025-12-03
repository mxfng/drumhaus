import React from "react";

export const Footer: React.FC = () => (
  <div className="flex h-10 items-center justify-center">
    <div className="text-foreground flex">
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
        className="ml-1 text-sm text-gray-500"
      >
        Support on ko-fi.
      </a>
    </div>
  </div>
);

export default Footer;
