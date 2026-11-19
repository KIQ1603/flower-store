import { useState } from "react";
import { Icon } from "./Icons";
import { Reveal } from "./Reveal";
import { ChibiGift, ChibiPicking, ChibiRibbon, ChibiScooter } from "./Illustrations";
import { processSteps } from "../data";
import { cn } from "../utils/cn";

const sketches = [ChibiPicking, ChibiRibbon, ChibiScooter, ChibiGift];
const stepIcons = ["leaf", "gift", "truck", "heart"] as const;

export function Process() {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section
      id="quy-trinh"
      className="relative z-10 overflow-hidden border-y border-line bg-cream-2/55 py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-20 h-[420px] w-[420px] rounded-full bg-rose-soft/45 blur-[100px]"
      />
      <div className="container-x relative">
        <div className="mx-auto max-w-[640px] text-center">
          <Reveal>
            <p className="eyebrow justify-center">
              <span className="h-px w-7 bg-rose-deep/60" />
              Từ vườn đến vòng tay
              <span className="h-px w-7 bg-rose-deep/60" />
            </p>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="display mt-4 text-[clamp(2.2rem,4.8vw,3.4rem)] text-ink">
              Bốn bước nhỏ, <span className="italic text-shimmer">một điều lành</span>
            </h2>
          </Reveal>
          <Reveal delay={110}>
            <p className="hand mt-2 text-[23px] text-rose-deep">làm bằng tay, từng bó một.</p>
          </Reveal>
        </div>

        <Reveal className="relative mt-12 lg:mt-14">
          {/* Connecting timeline line (desktop) */}
          <div aria-hidden="true" className="absolute top-[30px] right-[12%] left-[12%] hidden h-[2px] bg-line lg:block">
            <div className="process-line h-full w-full bg-gradient-to-r from-sage-deep via-rose-deep to-gold" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => {
              const Sketch = sketches[index];
              const isFocused = activeStep === index;
              return (
                <Reveal key={step.number} delay={index * 100} from="scale" className="h-full">
                  <article
                    onMouseEnter={() => setActiveStep(index)}
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      "group relative flex h-full cursor-pointer flex-col rounded-[28px] border bg-paper p-5 transition-all duration-500",
                      isFocused
                        ? "border-rose-deep/75 shadow-[0_32px_65px_-34px_rgba(196,86,110,0.38)] -translate-y-1"
                        : "border-line shadow-[0_22px_45px_-34px_rgba(54,62,51,0.25)] hover:-translate-y-1 hover:border-rose-deep/50"
                    )}
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <span
                        className={cn(
                          "step-icon-bubble grid h-11 w-11 place-items-center rounded-full border-2 shadow-xs transition-all duration-500",
                          isFocused
                            ? "border-rose-deep bg-rose-deep text-white scale-110"
                            : "border-line bg-sage-soft text-sage-deep"
                        )}
                      >
                        <Icon name={stepIcons[index]} size={17} />
                      </span>
                      <span className="rounded-full border border-line bg-cream px-2.5 py-1 text-[9px] font-medium tracking-[0.12em] text-ink-soft uppercase">
                        {step.badge}
                      </span>
                    </div>

                    {/* Inner bordered stage for Chibi Illustration */}
                    <div className="relative mx-auto mt-4 flex h-[175px] w-full items-center justify-center rounded-[20px] border border-line/80 bg-gradient-to-b from-rose-mist/50 to-sage-mist/45 p-2">
                      <Sketch className="relative z-10 h-full w-full drop-shadow-[0_14px_18px_rgba(54,62,51,0.14)] transition-transform duration-700 group-hover:scale-[1.06]" />
                    </div>

                    <div className="mt-4 flex flex-1 flex-col px-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">
                          Bước {step.number}
                        </span>
                        <span className="h-px flex-1 bg-line" />
                      </div>
                      <h3 className="mt-1.5 font-serif text-[23px] leading-tight text-ink transition-colors duration-300 group-hover:text-rose-deep">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[12px] leading-[1.8] font-light text-ink-soft">{step.copy}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
