import { useI18n } from "../i18n/LanguageContext";
import type { ProjectFeatureBlock } from "../types";

interface FeatureBlocksProps {
  blocks: ProjectFeatureBlock[];
}

/** Highlighted project features explained to clients (e.g. robotic parking): text, demo video and common questions. */
export function FeatureBlocks({ blocks }: FeatureBlocksProps) {
  const { t } = useI18n();
  if (blocks.length === 0) return null;

  return (
    <div className="feature-blocks">
      {blocks.map((block) => (
        <article className="feature-block" key={block.key}>
          <div className="feature-block__copy">
            <h3 dir="auto">{block.title}</h3>
            {block.intro && <p dir="auto">{block.intro}</p>}
            {block.bullets.length > 0 && (
              <ul>
                {block.bullets.map((bullet) => (
                  <li key={bullet} dir="auto">{bullet}</li>
                ))}
              </ul>
            )}
          </div>
          {block.videoEmbedUrl && (
            <figure className="feature-block__video">
              <iframe
                src={block.videoEmbedUrl}
                title={block.videoCaption || block.title}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              {block.videoCaption && <figcaption dir="auto">{block.videoCaption}</figcaption>}
            </figure>
          )}
          {block.faqs.length > 0 && (
            <div className="feature-block__faqs">
              <h4>{t("feature.faq")}</h4>
              {block.faqs.map((faq) => (
                <details key={faq.q}>
                  <summary dir="auto">{faq.q}</summary>
                  <p dir="auto">{faq.a}</p>
                </details>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
