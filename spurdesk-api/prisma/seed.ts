import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding knowledge base...');

  const faqs = [
    // --- SpurStore Mock E-commerce Policies ---
    {
      question: 'What is your shipping policy and delivery times?',
      answer: 'We offer free shipping on all orders over $50. Currently, we only ship within the USA. Standard delivery takes 3 to 5 business days.',
      keywords: 'shipping,ship,delivery,usa,cost,free shipping,international,countries,days'
    },
    {
      question: 'What is your return and refund policy?',
      answer: 'We offer a 30-day return window from the date of purchase. Items must be in their original condition. The buyer pays for return shipping unless the product is defective.',
      keywords: 'return,refund,30 days,policy,buyer pays,defective,money back,returns'
    },
    {
      question: 'What are your support hours?',
      answer: 'Our customer support team is available Monday through Friday, 9:00 AM to 6:00 PM EST. We are closed on weekends and federal holidays.',
      keywords: 'hours,support hours,business hours,time,weekend,open,days,timezone'
    },
    {
      question: 'How can I contact support?',
      answer: 'You can contact us by email at support@spurdesk.com or by sending a message right here in this live chat widget.',
      keywords: 'contact,email,support,live chat,write,help,talk to agent,customer support'
    },
    {
      question: 'How can I track my order?',
      answer: 'Once your order is shipped, you will receive an email containing a tracking link and code. You can use that link to track the status of your delivery.',
      keywords: 'track,order,status,tracking,delivery status,package,where is my'
    },

    // --- Spur Platform & Product FAQs ---
    {
      question: 'What is Spur and what does it do?',
      answer: 'Spur is a multi-channel AI Agent platform for marketing and customer support. It helps businesses sell more and support better by automating customer interactions across WhatsApp, Instagram, Live Chat, and Facebook.',
      keywords: 'what is spur,spur,overview,channels,about spur,marketing,customer support,ai agent'
    },
    {
      question: 'What are the main features of Spur?',
      answer: 'Spur features Actionable AI (integrates with external systems to pull data, update orders, book meetings), No-Code Setup, Seamless Handover (to human agents), Lead Capture & Qualification, a Shared Collaborative Inbox, and a full Marketing Automation Suite.',
      keywords: 'features,capabilities,actionable ai,no-code,handover,human agent,lead capture,inbox,marketing suite'
    },
    {
      question: 'Does Spur support WhatsApp Marketing, and what are its features?',
      answer: 'Yes! Spur is a complete WhatsApp marketing platform. It features bulk broadcast campaigns (with rich media and buttons), automated Shopify-native abandoned cart recovery (with custom discount codes), COD to prepaid conversion, automatic sync of your product catalog to WhatsApp, and automated order notifications (shipping updates, confirmation via Razorpay, Shiprocket, etc.).',
      keywords: 'whatsapp,broadcast,cart recovery,abandoned cart,catalog,notifications,prepaid,cod,rto'
    },
    {
      question: 'What integrations does Spur support?',
      answer: 'Spur connects with major D2C and payment platforms, including Shopify, WooCommerce, Stripe, Razorpay, Shiprocket, Return Prime, FlexyPe, and Delhivery.',
      keywords: 'integrate,integrations,shopify,woocommerce,stripe,razorpay,shiprocket,return prime,flexype,delhivery'
    },
    {
      question: 'What results can I expect from using Spur?',
      answer: 'On average, businesses using Spur see 90% fewer support escalations, 10x faster resolution times, a 30% higher Customer Satisfaction (CSAT) score, and over 40% cart recovery rates.',
      keywords: 'results,metrics,csat,escalation,resolution,roi,rates,conversion'
    },
    {
      question: 'Is Spur secure and compliant?',
      answer: 'Absolutely. Spur is fully GDPR-compliant, encrypts all customer data at rest and in transit, and is an official Meta Business Partner, meaning your customer details are completely safe and secure.',
      keywords: 'security,secure,gdpr,compliance,compliant,meta partner,encrypt,data protection,privacy'
    },
    {
      question: 'How do I set up Spur and get started?',
      answer: 'Getting started takes under 30 minutes: 1) Connect your Shopify or WooCommerce store (products/customers sync in 15 mins), 2) Provision your official WhatsApp Business API number directly through Spur, 3) Build your subscriber list, and 4) Add knowledge sources and deploy your AI agents or campaigns.',
      keywords: 'setup,install,started,how to set up,steps,whatsapp business api,get started'
    },
    {
      question: 'How does the human handover work?',
      answer: 'When a customer query becomes too complex, or if the customer explicitly requests a human, the Spur AI Agent seamlessly hands the conversation over to a human agent in the Shared Inbox, keeping your team in sync.',
      keywords: 'handover,human,complex issues,escalation,pass,agent,ticketing'
    },
    {
      question: 'How does COD (Cash on Delivery) to Prepaid conversion work?',
      answer: 'Spur automates Cash on Delivery order verification via WhatsApp. It sends customers payment links (supporting Razorpay, Stripe, etc.) along with configurable discounts to incentivize them to convert their order to prepaid, significantly reducing Return to Origin (RTO) rates.',
      keywords: 'cod,prepaid,rto,cash on delivery,verification,prepaid conversion'
    },

    // --- Spur Detailed Pricing Plans & Add-ons ---
    {
      question: 'What are Spur\'s subscription pricing plans and costs?',
      answer: 'Spur offers four main pricing plans with a 7-day free trial (no credit card required) and a 20% discount on annual billing:\n' +
        '1. **AI Acquire (Marketer\'s Choice)**: ₹999/month (billed monthly) or ₹799/month (billed annually as ₹9,590 + 18% GST = ₹11,318/year).\n' +
        '2. **AI Start (Most Popular)**: ₹3,499/month (billed monthly) or ₹2,799/month (billed annually as ₹33,590 + 18% GST = ₹39,638/year).\n' +
        '3. **AI Accelerate**: ₹12,999/month (billed monthly) or ₹10,399/month (billed annually as ₹1,24,790 + 18% GST = ₹1,47,254/year).\n' +
        '4. **AI Max**: ₹39,999/month (billed monthly) or ₹31,999/month (billed annually as ₹3,83,990 + 18% GST = ₹4,53,110/year).\n' +
        '5. **Custom Plan**: Contact Sales for tailored limits, custom AI credits, custom integrations, and priority rollouts.',
      keywords: 'pricing,cost,price,plans,annual,gst,monthly,subscription,acquire,start,accelerate,max,bill,billing'
    },
    {
      question: 'What features are included in each Spur subscription plan (Acquire vs Start vs Accelerate vs Max)?',
      answer: 'Here is a comparison of limits per plan tier:\n' +
        '* **AI Acquire**: 1 User seat, 1 AI Agent with 100 AI credits, 3 Automation flows on Instagram & Facebook, 15 Spur Segments, Shared Inbox (WA, IG, FB, Livechat channels), and Email Support.\n' +
        '* **AI Start**: 2 User seats, 1 AI Agent with 2,000 AI credits, 25 Automation flows on WhatsApp/IG/FB, 15 Spur Segments, Shopify Integration, and Priority Email Support.\n' +
        '* **AI Accelerate**: 5 User seats, 2 AI Agents with 12,000 AI credits, 50 Automation flows, 40 Spur Segments, 2 channels per type (Livechat/WA/IG/FB), Webhooks/HTTP triggers, Custom AI Actions, and Priority WhatsApp Support.\n' +
        '* **AI Max**: 10 User seats, 3 AI Agents with 20,000 AI credits, 100 Spur Segments, 3 channels per type, Unlimited Automation flows, Bulk WhatsApp Pricing, and a Dedicated Account Manager.',
      keywords: 'plan details,acquire,start,accelerate,max,limits,features,seats,flows,segments,credits,agent count'
    },
    {
      question: 'What features are unlimited across all Spur subscription plans?',
      answer: 'To make sure growth doesn\'t have limits, Spur offers the following completely unlimited features on ALL plans (including AI Acquire):\n' +
        '* Unlimited Contacts\n' +
        '* Unlimited Teams\n' +
        '* Unlimited WhatsApp Broadcasts\n' +
        '* Unlimited Automation Executions\n' +
        '* Unlimited Tags\n' +
        '* Unlimited Tickets',
      keywords: 'unlimited,caps,limits,contact limit,teams limit,broadcast limit,tags,tickets'
    },
    {
      question: 'What add-ons can I buy to customize my Spur plan?',
      answer: 'You can fine-tune any Spur plan with these monthly add-ons:\n' +
        '* **Additional AI Agent**: ₹599/month\n' +
        '* **Additional Live Chat Channel**: ₹599/month\n' +
        '* **Remove Branding**: ₹2,999/month (fully white-labeled chat widget)\n' +
        '* **Additional AI Credits**: ₹999 per 1,000 credits (credits never expire)\n' +
        '* **Additional WhatsApp Channel**: ₹1,999/month\n' +
        '* **Instagram/Facebook Channel**: ₹999/month\n' +
        '* **Email Channel**: ₹2,999/month (handle emails in the shared inbox)\n' +
        '* **Additional User Seat**: ₹999/month',
      keywords: 'add-ons,add-on,addons,branding,credits,user,seat,whatsapp,facebook,instagram,email channel,cost'
    },
    {
      question: 'What free marketing tools does Spur offer?',
      answer: 'Spur offers 17+ free tools without signup or account creation to help grow your D2C business:\n' +
        '* **Calculators**: Facebook Engagement Rate, Google Review (target rating calculator), WhatsApp Pricing Calculator, and OpenAI API Pricing Calculator.\n' +
        '* **Generators**: Instagram Username, Tiny Text Generator, Instagram Caption Generator, WhatsApp Chat Link, WhatsApp Share Link (multi-contacts), WhatsApp QR Code, Facebook Chat Link, Instagram Chat Link, and Email Mailto Link.\n' +
        '* **Writing & AI**: LinkedIn Text Formatter (adds bold/italic), AI Sentence Rewriter, and AI Chat PDF (chat with PDF documents).\n' +
        '* **Utilities**: Facebook Business Verification (fixes greyed-out button in Business Manager).',
      keywords: 'free tools,calculators,generators,username,caption,qr code,mailto,verification,rewriter,pdf,tools'
    },
    {
      question: 'What is the ROI and cost comparison of using Spur vs manual support?',
      answer: 'Replying to customer queries, tracking orders, managing broadcasts, and answering DMs manually takes about 16 hours of labor per day, costing approximately $2,560/month (at a rate of $8/hour).\n' +
        'By contrast, Spur handles all of these workflows entirely with AI agents, automated broadcasts, and smart ticket routing, representing a **~300% savings in monthly support costs** while achieving full 24/7 automation.',
      keywords: 'roi,compare,savings,manual,cost comparison,labor,savings,rest,no contest'
    }
  ];

  // Clear existing entries
  await prisma.knowledgeBase.deleteMany({});

  for (const faq of faqs) {
    const entry = await prisma.knowledgeBase.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords,
      }
    });
    console.log(`Seeded: "${entry.question}"`);
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
