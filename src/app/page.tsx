import Link from "next/link";
import {
  Mic,
  BarChart3,
  Trophy,
  Zap,
  GitCompare,
  ArrowRight,
  Headphones,
} from "lucide-react";

const features = [
  {
    icon: GitCompare,
    title: "Arena Mode",
    description:
      "Blind A/B comparison of speech-to-speech models. Listen, vote, and let the crowd decide which AI sounds best.",
    href: "/arena",
    color: "text-violet-500",
  },
  {
    icon: BarChart3,
    title: "Evaluation Framework",
    description:
      "Automated benchmarks with LLM judge scoring, WER calculation, latency metrics, and exportable results.",
    href: "/eval",
    color: "text-blue-500",
  },
  {
    icon: Trophy,
    title: "Elo Leaderboard",
    description:
      "Live provider rankings powered by crowd-sourced human preferences with statistical confidence intervals.",
    href: "/leaderboard",
    color: "text-amber-500",
  },
];

const capabilities = [
  {
    icon: Mic,
    label: "Speech-to-Speech",
    detail: "Full voice pipeline evaluation",
  },
  {
    icon: Headphones,
    label: "Multi-Provider",
    detail: "OpenAI, Gemini, Retell AI, and more",
  },
  {
    icon: Zap,
    label: "Latency Tracking",
    detail: "TTFB and total response time",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto flex flex-col items-center gap-8 px-4 py-20 text-center md:py-28 lg:py-36">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            Open Source Voice AI Benchmarking
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Benchmark Voice AI
            <br />
            <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
              Like Never Before
            </span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
            Chatbot Arena meets voice AI. Blind comparisons, Elo rankings, and
            automated evaluation — all open source. Know which speech-to-speech
            model actually sounds best.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/arena"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Try the Arena
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex h-12 items-center gap-2 rounded-lg border px-6 text-base font-medium transition-colors hover:bg-muted"
            >
              View Leaderboard
            </Link>
          </div>

          {/* Capability pills */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {capabilities.map((cap) => (
              <div
                key={cap.label}
                className="flex items-center gap-2 rounded-lg border bg-background/80 px-4 py-2 text-sm backdrop-blur"
              >
                <cap.icon className="size-4 text-muted-foreground" />
                <span className="font-medium">{cap.label}</span>
                <span className="hidden text-muted-foreground sm:inline">
                  — {cap.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything You Need
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            A complete toolkit for evaluating and comparing voice AI providers
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative flex flex-col gap-4 rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div
                className={`inline-flex size-12 items-center justify-center rounded-lg border bg-muted/50 ${feature.color}`}
              >
                <feature.icon className="size-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Get started <ArrowRight className="size-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              How the Arena Works
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Unbiased voice AI ranking in four simple steps
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {[
              {
                step: "1",
                title: "Select Category",
                desc: "Choose a scenario type — general, customer support, creative, or multilingual.",
              },
              {
                step: "2",
                title: "Listen Blind",
                desc: "Hear two anonymous AI responses to the same prompt. Provider identity is hidden.",
              },
              {
                step: "3",
                title: "Cast Your Vote",
                desc: "Pick the better response, or call it a tie. Use keyboard shortcuts for speed.",
              },
              {
                step: "4",
                title: "See Rankings",
                desc: "Providers are revealed, Elo ratings update, and the leaderboard shifts in real time.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-lg border bg-card p-5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-16 text-center md:py-24">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Benchmark?
          </h2>
          <p className="max-w-lg text-muted-foreground">
            Set up your providers, import scenarios, and start comparing in
            minutes. Fully local, fully open source.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/settings"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Configure Providers
            </Link>
            <a
              href="https://github.com/mhmdez/voicebench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg border px-6 font-medium transition-colors hover:bg-muted"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
