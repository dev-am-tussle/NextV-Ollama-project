"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Sparkles,
  Star,
  Check,
  ChevronDown,
  Twitter,
  Github,
  Linkedin,
  Code,
  Bot,
  Workflow,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

const SkeletonLoader = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer rounded ${className}`}
  />
)

const LazyImage = ({
  src,
  alt,
  className,
  skeletonClassName,
}: {
  src: string
  alt: string
  className?: string
  skeletonClassName?: string
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById(`lazy-${alt}`)
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [alt])

  return (
    <div id={`lazy-${alt}`} className={className}>
      {!isInView || isLoading ? (
        <SkeletonLoader className={skeletonClassName || "w-full h-full"} />
      ) : (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          className={className}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      )}
    </div>
  )
}

export default function GetStartedPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const trustedCompanies = ["TechCorp", "InnovateLabs", "StartupX", "DevFlow", "CodeBase", "AITech"]

  const workflowFeatures = [
    {
      icon: Code,
      title: "Smart Code Generation",
      description: "Generate high-quality code snippets and complete functions with AI assistance.",
    },
    {
      icon: Bot,
      title: "Intelligent Debugging",
      description: "Identify and fix bugs faster with AI-powered error analysis and solutions.",
    },
    {
      icon: Workflow,
      title: "Automated Workflows",
      description: "Streamline your development process with intelligent automation tools.",
    },
  ]

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: ["5 AI conversations per day", "Basic model access", "Community support", "Standard response time"],
      popular: false,
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      description: "For power users and professionals",
      features: [
        "Unlimited conversations",
        "Access to all AI models",
        "Priority support",
        "Faster response times",
        "Advanced features",
        "Export conversations",
      ],
      popular: true,
    },
    {
      name: "Team",
      price: "$49",
      period: "per month",
      description: "For teams and organizations",
      features: [
        "Everything in Pro",
        "Team collaboration",
        "Admin dashboard",
        "Usage analytics",
        "Custom integrations",
        "Dedicated support",
      ],
      popular: false,
    },
  ]

  const faqs = [
    {
      question: "What AI models are supported?",
      answer:
        "We support a wide range of AI models including GPT-4, Claude, Llama, and many others. You can switch between models or compare responses from multiple models simultaneously.",
    },
    {
      question: "Is my data secure and private?",
      answer:
        "Yes, we take privacy seriously. Your conversations are encrypted and we don't store personal data. You have full control over your data and can delete it at any time.",
    },
    {
      question: "Can I use this for commercial projects?",
      answer:
        "Our Pro and Team plans are designed for commercial use. You can integrate our AI capabilities into your business workflows and applications.",
    },
    {
      question: "How does the pricing work?",
      answer:
        "We offer flexible pricing based on usage. The Free plan gives you a taste of our capabilities, while Pro and Team plans offer unlimited access with additional features.",
    },
    {
      question: "Do you offer API access?",
      answer:
        "Yes, API access is available for Pro and Team subscribers. You can integrate our AI capabilities directly into your applications and workflows.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Pointer</span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#testimonials"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Testimonials
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="hidden sm:flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Try for Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Unleash the Power
              <span className="block text-primary">of AI Agents</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Accelerate your development workflow with intelligent AI agents that write, review, and optimize your
              code.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/auth/signup" className="flex items-center">
                  Signup for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-6xl">
            <LazyImage
              src="/dark-code-editor-interface-with-file-explorer-and-.jpg"
              alt="Code Editor Interface"
              className="rounded-lg border border-border shadow-2xl"
              skeletonClassName="h-[600px] w-full"
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-8">Trusted by fast-growing startups</p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              {trustedCompanies.map((company, index) => (
                <div key={index} className="flex items-center">
                  <SkeletonLoader className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Empower Your Workflow with AI
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Transform how you code with intelligent AI assistance that understands your needs.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {workflowFeatures.map((feature, index) => (
              <Card
                key={index}
                className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-16">What Our Users Say</h2>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-8">
              <div className="flex flex-col items-center">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-xl font-medium text-foreground mb-6 italic">
                  "Pointer's real-time previews cut our debugging time in half and made coding collaboratively actually
                  enjoyable."
                </blockquote>
                <div className="flex items-center space-x-4">
                  <LazyImage
                    src="/professional-ceo-headshot-avatar.jpg"
                    alt="CEO Avatar"
                    className="h-15 w-15 rounded-full"
                    skeletonClassName="h-15 w-15 rounded-full"
                  />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">CEO, TechFlow</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">Choose the plan that's right for you and your team.</p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 ${
                  plan.popular ? "ring-2 ring-primary shadow-lg scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">Most Popular</Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-6" variant={plan.popular ? "default" : "outline"} asChild>
                    <Link href="/auth/signup">{plan.name === "Free" ? "Get Started" : "Start Free Trial"}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">Everything you need to know about Pointer AI.</p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl">
            {faqs.map((faq, index) => (
              <Card key={index} className="mb-4 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="cursor-pointer" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">{faq.question}</CardTitle>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </CardHeader>
                {openFaq === index && (
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Coding made effortless</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Hear how developers ship products faster, collaborate seamlessly, and build with confidence using
              Pointer's powerful AI tools
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/auth/signup" className="flex items-center">
                  Signup for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">Pointer</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Coding made effortless</p>
              <div className="flex space-x-4">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                <Github className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Real-time Previews
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Multi-Agent Coding
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Our team
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Brand
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Terms of use
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
