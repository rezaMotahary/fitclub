import { BRAND_LOGO } from "@/lib/brand";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  wordmark?: boolean;
  decorative?: boolean;
  className?: string;
};

export function BrandLogo({
  size = "md",
  wordmark = false,
  decorative = false,
  className,
}: BrandLogoProps) {
  const classes = ["brand-lockup", `brand-lockup-${size}`];
  if (className) classes.push(className);

  return (
    <span className={classes.join(" ")}>
      <span className="brand-mark-img" aria-hidden="true">
        <img
          className="brand-logo brand-logo-dark"
          src={BRAND_LOGO.dark.src}
          alt=""
          width={512}
          height={512}
        />
        <img
          className="brand-logo brand-logo-light"
          src={BRAND_LOGO.light.src}
          alt=""
          width={512}
          height={512}
        />
      </span>
      {wordmark ? (
        <span className="brand-wordmark ltr-isolate" dir="ltr" aria-hidden="true">
          FIT<span>CLUB</span>
        </span>
      ) : null}
      {decorative ? null : <span className="sr-only">فیت‌کلاب</span>}
    </span>
  );
}
