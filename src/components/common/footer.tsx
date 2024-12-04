export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm leading-loose text-center text-muted-foreground md:text-left">
          Built with{' '}
          <a
            href="https://astro.build"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Astro
          </a>
          . The source code is available on{' '}
          <a
            href="https://github.com/your-username/patient-psi-astro"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Patient PSI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
