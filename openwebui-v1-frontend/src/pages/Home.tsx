import React, { useEffect, useRef } from "react";
import * as authService from "@/services/auth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Code,
  Zap,
  Shield,
  Rocket,
  Users,
  Star,
} from "lucide-react";
import heroMockup from "@/assets/hero-mockup.jpg";
import ceoAvatar from "@/assets/ceo-avatar.jpg";

const Home = () => {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            entry.target.classList.remove("reveal-hidden");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".reveal-hidden");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Debug: fetch /auth/me on mount and print response so you can inspect user details
  useEffect(() => {
    (async function fetchMe() {
      try {
        const me = await authService.me();
        console.log("[Home] /auth/me response:", me);
      } catch (err) {
        console.warn("[Home] /auth/me failed:", err);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-balance">
                Unleash the Power of{" "}
                <span className="text-primary">AI Agents</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Accelerate your development workflow with intelligent AI agents
                that understand your code and boost productivity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="btn-hover" asChild>
                  <Link to="/auth/signup">
                    Sign up for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="#features">Learn more</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={heroMockup}
                  alt="AI-powered code editor interface showing intelligent agent assistance"
                  className="w-full h-full object-cover animate-shimmer"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y bg-muted/20">
        <div className="container px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by developers at
          </p>
          <div
            className="grid grid-cols-3 md:grid-cols-7 gap-8 items-center justify-items-center"
            aria-label="List of company logos"
          >
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <img
                  src={`https://placeholder.svg?height=32&width=80&text=Logo${
                    i + 1
                  }`}
                  alt={`Company ${i + 1} logo`}
                  className="h-8 w-20 object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 reveal-hidden">
        <div className="container px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-balance">Empower Your Workflow</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Powerful AI agents designed to integrate seamlessly into your
              development process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Code,
                title: "Intelligent Code Generation",
                description:
                  "Generate high-quality code snippets and complete functions with AI assistance.",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Get instant responses and real-time code suggestions to accelerate development.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description:
                  "Your code stays private with enterprise-grade security and privacy protection.",
              },
              {
                icon: Rocket,
                title: "Boost Productivity",
                description:
                  "Reduce development time by up to 50% with intelligent automation and suggestions.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Share AI agents and knowledge across your development team effortlessly.",
              },
              {
                icon: Star,
                title: "Best-in-Class",
                description:
                  "Powered by the latest AI models with continuously improving capabilities.",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
              >
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product Mockup */}
      <section className="py-20 bg-muted/20 reveal-hidden">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-balance">See It In Action</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Experience the future of coding with our intuitive AI-powered
                interface.
              </p>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-background border shadow-2xl">
              <div className="aspect-video animate-shimmer">
                <img
                  src="https://placeholder.svg?height=600&width=1000&text=AI+Code+Assistant+Interface"
                  alt="Detailed view of AI code assistant interface with multiple panels"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 reveal-hidden">
        <div className="container px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-balance">What Developers Say</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Join thousands of developers who have transformed their workflow.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="p-8">
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-1" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                  ))}
                </div>
                <blockquote className="text-xl leading-relaxed">
                  "Pointer has completely revolutionized how we approach
                  development. Our team's productivity has increased by 60%
                  since we started using AI agents for code generation and
                  review."
                </blockquote>
                <div className="flex items-center space-x-4">
                  <img
                    src={ceoAvatar}
                    alt="Sarah Chen, CEO of TechFlow"
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">Sarah Chen</p>
                    <p className="text-muted-foreground">CEO, TechFlow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/20 reveal-hidden">
        <div className="container px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-balance">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Choose the plan that fits your development needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description:
                  "Perfect for individual developers getting started",
                features: [
                  "10 AI requests per day",
                  "Basic code generation",
                  "Community support",
                  "Standard response time",
                ],
                cta: "Get started",
                href: "/auth/signup",
              },
              {
                name: "Pro",
                price: "$19",
                description: "For professional developers who need more power",
                features: [
                  "Unlimited AI requests",
                  "Advanced code generation",
                  "Priority support",
                  "Instant responses",
                  "Team collaboration",
                  "Custom integrations",
                ],
                cta: "Start Pro trial",
                href: "/auth/signup",
                popular: true,
              },
              {
                name: "Team",
                price: "Custom",
                description: "Enterprise-grade solution for development teams",
                features: [
                  "Everything in Pro",
                  "Advanced analytics",
                  "SSO integration",
                  "Dedicated support",
                  "Custom AI training",
                  "On-premise deployment",
                ],
                cta: "Contact sales",
                href: "#",
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`relative h-full ${
                  plan.popular ? "border-primary shadow-lg scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <p className="text-4xl font-bold">
                      {plan.price}
                      {plan.price !== "Custom" && (
                        <span className="text-lg font-normal text-muted-foreground">
                          /month
                        </span>
                      )}
                    </p>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full btn-hover"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 reveal-hidden">
        <div className="container px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-balance">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Everything you need to know about Pointer.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible>
              {[
                {
                  question:
                    "How does Pointer integrate with my existing development tools?",
                  answer:
                    "Pointer seamlessly integrates with popular IDEs and code editors through our extensions and APIs. You can continue using your favorite tools while gaining AI-powered assistance.",
                },
                {
                  question: "Is my code secure and private?",
                  answer:
                    "Absolutely. We use enterprise-grade encryption and never store your code permanently. All processing happens in secure, isolated environments, and we're SOC 2 compliant.",
                },
                {
                  question: "What programming languages does Pointer support?",
                  answer:
                    "Pointer supports all major programming languages including JavaScript, Python, TypeScript, Java, C++, Go, Rust, and many more. Our AI models are continuously trained on diverse codebases.",
                },
                {
                  question: "Can I use Pointer for team collaboration?",
                  answer:
                    "Yes! Pro and Team plans include collaboration features like shared AI agents, team workspaces, and knowledge sharing capabilities to boost your entire team's productivity.",
                },
                {
                  question: "What's the difference between the pricing plans?",
                  answer:
                    "Free gives you basic access to get started. Pro includes unlimited requests, advanced features, and priority support. Team adds enterprise features like SSO, analytics, and custom training.",
                },
                {
                  question: "How do I get started?",
                  answer:
                    "Simply sign up for a free account, install our extension in your IDE, and start chatting with your AI coding assistant. No complex setup required!",
                },
                {
                  question: "What kind of support do you offer?",
                  answer:
                    "We offer community support for free users, priority email support for Pro users, and dedicated support channels for Team customers. Our documentation and tutorials are available to everyone.",
                },
                {
                  question: "Can I cancel my subscription anytime?",
                  answer:
                    "Yes, you can cancel your subscription at any time. There are no long-term contracts, and you'll continue to have access until the end of your billing period.",
                },
              ].map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-primary text-primary-foreground reveal-hidden">
        <div className="container px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-balance text-white">Coding Made Effortless</h2>
            <p className="text-xl leading-relaxed text-primary-foreground/90">
              Join thousands of developers who have already transformed their
              workflow with AI agents. Start your journey today.
            </p>
            <Button size="lg" variant="secondary" className="btn-hover" asChild>
              <Link to="/auth/signup">
                Sign up for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
