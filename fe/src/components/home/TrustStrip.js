import { Headset, Layers, UsersRound } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { Container, Stars } from "@/components/ui";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";

const icons = {
  tripadvisor: <TripAdvisorIcon className="size-9 text-[#00af87]" />,
  google: <GoogleIcon className="size-8" />,
  team: <UsersRound className="size-8 text-forest-700" />,
  support: <Headset className="size-8 text-forest-700" />,
  all: <Layers className="size-8 text-forest-700" />,
};

/** Dải uy tín dưới hero (như localvietnam.com): đánh giá Tripadvisor/Google + điểm mạnh. */
export default function TrustStrip({ items }) {
  return (
    <section className="bg-cream-50">
      <Container>
        <ul className="grid grid-cols-2 gap-y-6 py-8 md:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-border">
          {items.map((x) => {
            const rated = x.kind === "tripadvisor" || x.kind === "google";
            const href =
              x.kind === "tripadvisor"
                ? siteConfig.social.tripadvisor
                : x.kind === "google"
                  ? siteConfig.social.google
                  : null;
            const Tag = href ? "a" : "div";
            return (
              <li
                key={x.kind}
                className="px-3 max-md:last:col-span-2 max-md:last:justify-self-center lg:px-5 lg:first:pl-0"
              >
                <Tag
                  {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-start gap-3"
                >
                  <span className="shrink-0">{icons[x.kind]}</span>
                  <span className="leading-tight">
                    <span className="flex flex-wrap items-center gap-x-2 font-bold text-ink">
                      {x.t}
                      {rated && (
                        <Stars
                          value={
                            x.kind === "google"
                              ? siteConfig.googleRating
                              : siteConfig.tripadvisorRating.score
                          }
                          size={14}
                        />
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{x.d}</span>
                  </span>
                </Tag>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
