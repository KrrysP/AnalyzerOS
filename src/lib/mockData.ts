import {
  UploadDatasetResult,
  AnalysisResponse,
  InsightCardData,
  InvestigationNode,
} from './types';

export const OLIST_DATASET_PROFILE: UploadDatasetResult = {
  success: true,
  dataset: {
    // Display-only fixture. It is never eligible to become an active backend dataset.
    id: "",
    name: "olist_orders.csv",
    original_filename: "olist_orders.csv",
    row_count_raw: 99441,
    row_count_clean: 99441,
    column_count: 40,
    quality_score: 94,
    domain: "E-Commerce & Marketplace Retail",
    grain: { description: "Order item level, transaction timestamp", confidence: "high" },
    upload_date: "June 30, 2017",
    file_size: "34.2 MB",
  },
  detected: {
    columns: [
      { name: "order_id", type: "text", role: "identifier", missing_pct: 0, unique_values: 99441 },
      { name: "customer_id", type: "text", role: "identifier", missing_pct: 0, unique_values: 99441 },
      { name: "order_status", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 8 },
      { name: "order_purchase_timestamp", type: "datetime", role: "time", missing_pct: 0, unique_values: 98875 },
      { name: "order_approved_at", type: "datetime", role: "time", missing_pct: 0.16, unique_values: 90643 },
      { name: "order_delivered_customer_date", type: "datetime", role: "time", missing_pct: 2.98, unique_values: 95664 },
      { name: "order_estimated_delivery_date", type: "datetime", role: "time", missing_pct: 0, unique_values: 459 },
      { name: "payment_value", type: "numeric", role: "metric", missing_pct: 0, unique_values: 29077 },
      { name: "payment_type", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 4 },
      { name: "payment_installments", type: "numeric", role: "dimension", missing_pct: 0, unique_values: 24 },
      { name: "price", type: "numeric", role: "metric", missing_pct: 0, unique_values: 5968 },
      { name: "freight_value", type: "numeric", role: "metric", missing_pct: 0, unique_values: 6999 },
      { name: "customer_city", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 4119 },
      { name: "customer_state", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 27 },
      { name: "product_category_name", type: "categorical", role: "dimension", missing_pct: 1.4, unique_values: 73 },
      { name: "review_score", type: "numeric", role: "metric", missing_pct: 0.7, unique_values: 5 },
      { name: "seller_state", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 23 },
      { name: "customer_type", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 2 }
    ],
    metrics: [
      { metric_name: "payment_value", metric_type: "additive", formula_description: "Gross merchandise volume (GMV) aggregate sum", confidence: 0.98, requires_confirmation: false },
      { metric_name: "price", metric_type: "additive", formula_description: "Catalog item base sale price", confidence: 0.97, requires_confirmation: false },
      { metric_name: "freight_value", metric_type: "additive", formula_description: "Logistics and shipping cost", confidence: 0.95, requires_confirmation: false },
      { metric_name: "review_score", metric_type: "average", formula_description: "Post-delivery review satisfaction rating (1-5)", confidence: 0.92, requires_confirmation: true }
    ],
    dimensions: ["customer_state", "product_category_name", "order_status", "payment_type", "customer_city", "seller_state", "customer_type"],
    time_fields: ["order_purchase_timestamp", "order_delivered_customer_date", "order_estimated_delivery_date"]
  },
  cleaning: {
    automatic_actions: [
      "Validated 99,441 unique order records across May–June 2017",
      "Parsed ISO 8601 timestamps for purchase, approval, and delivery cycles",
      "Normalized 27 Brazilian state codes (UF standard)",
      "Standardized payment methods into: Credit Card, Boleto, Voucher, Debit",
      "Calculated baseline AOV = payment_value / order_id count",
      "Flagged 7.4% orders where delivered_date > estimated_delivery_date"
    ],
    suggested_actions: [
      "Imputation of missing delivery dates for in-transit orders (Not automatically applied)",
      "Outlier capping on transactions exceeding R$ 5,000 (Not automatically applied)"
    ],
    quality_issues: [
      { severity: "info", field: "order_delivered_customer_date", issue: "2,965 missing delivery timestamps (2.9%)", action: "Orders still in transit or cancelled" },
      { severity: "warning", field: "product_category_name", issue: "610 missing product categories (1.4%)", action: "Assigned default to 'Uncategorized'" },
      { severity: "info", field: "payment_value", issue: "18 transactions with payment_value > R$ 5,000", action: "Verified enterprise bulk orders retained" }
    ]
  },
  next: {
    analyze_endpoint: "/webhook/dealos-analyze",
    suggested_question: "Give me a general business overview of this dataset, including the most important metrics, trends, segments, anomalies, and data limitations."
  },
  profile: {
    name: "olist_orders.csv",
    rows_raw: 99441,
    rows_clean: 99441,
    columns: 40,
    quality_score: 94,
    domain: "E-Commerce & Marketplace Retail",
    grain: "Order item level, transaction timestamp",
    upload_date: "June 30, 2017",
    file_size: "34.2 MB",
  },
  detected_columns: [
    { name: "order_id", type: "text", role: "identifier", missing_pct: 0, unique_values: 99441 },
    { name: "customer_id", type: "text", role: "identifier", missing_pct: 0, unique_values: 99441 },
    { name: "order_status", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 8 },
    { name: "order_purchase_timestamp", type: "datetime", role: "time", missing_pct: 0, unique_values: 98875 },
    { name: "order_approved_at", type: "datetime", role: "time", missing_pct: 0.16, unique_values: 90643 },
    { name: "order_delivered_customer_date", type: "datetime", role: "time", missing_pct: 2.98, unique_values: 95664 },
    { name: "order_estimated_delivery_date", type: "datetime", role: "time", missing_pct: 0, unique_values: 459 },
    { name: "payment_value", type: "numeric", role: "metric", missing_pct: 0, unique_values: 29077 },
    { name: "payment_type", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 4 },
    { name: "payment_installments", type: "numeric", role: "dimension", missing_pct: 0, unique_values: 24 },
    { name: "price", type: "numeric", role: "metric", missing_pct: 0, unique_values: 5968 },
    { name: "freight_value", type: "numeric", role: "metric", missing_pct: 0, unique_values: 6999 },
    { name: "customer_city", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 4119 },
    { name: "customer_state", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 27 },
    { name: "product_category_name", type: "categorical", role: "dimension", missing_pct: 1.4, unique_values: 73 },
    { name: "review_score", type: "numeric", role: "metric", missing_pct: 0.7, unique_values: 5 },
    { name: "seller_state", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 23 },
    { name: "customer_type", type: "categorical", role: "dimension", missing_pct: 0, unique_values: 2 }
  ],
  metrics: ["payment_value", "price", "freight_value", "review_score"],
  dimensions: ["customer_state", "product_category_name", "order_status", "payment_type", "customer_city", "seller_state", "customer_type"],
  time_fields: ["order_purchase_timestamp", "order_delivered_customer_date", "order_estimated_delivery_date"],
  quality_issues: [
    { severity: "info", field: "order_delivered_customer_date", issue: "2,965 missing delivery timestamps (2.9%)", action: "Orders still in transit or cancelled" },
    { severity: "warning", field: "product_category_name", issue: "610 missing product categories (1.4%)", action: "Assigned default to 'Uncategorized'" },
    { severity: "info", field: "payment_value", issue: "18 transactions with payment_value > R$ 5,000", action: "Verified enterprise bulk orders retained" }
  ],
  cleaning_log: [
    "Validated 99,441 unique order records across May–June 2017",
    "Parsed ISO 8601 timestamps for purchase, approval, and delivery cycles",
    "Normalized 27 Brazilian state codes (UF standard)",
    "Standardized payment methods into: Credit Card, Boleto, Voucher, Debit",
    "Calculated baseline AOV = payment_value / order_id count",
    "Flagged 7.4% orders where delivered_date > estimated_delivery_date"
  ],
  sample_rows: [
    { order_id: "e481f51cbdc54678b7cc49136f2d6af7", purchase_date: "2017-06-02", state: "SP", category: "housewares", payment_value: 141.46, status: "delivered", review: 5 },
    { order_id: "53cdb2488a1bbc7f770fba5723d51199", purchase_date: "2017-06-03", state: "BA", category: "auto", payment_value: 135.20, status: "delivered", review: 4 },
    { order_id: "47770eb9100c2d0c44946d9cf07ec65d", purchase_date: "2017-06-04", state: "GO", category: "toys", payment_value: 168.42, status: "delivered", review: 5 },
    { order_id: "949d5b44dbf5de918fe9c16f97b45f8a", purchase_date: "2017-06-05", state: "RN", category: "bed_bath_table", payment_value: 122.99, status: "delivered", review: 4 },
    { order_id: "ad21c59c0840e6cb83a9ceb5573f8159", purchase_date: "2017-06-06", state: "SP", category: "stationery", payment_value: 89.20, status: "delivered", review: 5 },
    { order_id: "a4591c265e18cb1dcee528d6e3831985", purchase_date: "2017-06-07", state: "RJ", category: "health_beauty", payment_value: 239.50, status: "delivered", review: 3 },
    { order_id: "136cce7faa4293821094105e6776b88f", purchase_date: "2017-06-08", state: "SP", category: "telephony", payment_value: 114.70, status: "delivered", review: 4 },
    { order_id: "6514b8ad80e05ca41dda1669f2877140", purchase_date: "2017-06-09", state: "MG", category: "watches_gifts", payment_value: 212.80, status: "delivered", review: 5 },
    { order_id: "76c6e866444da0ef29f309f52c4a16d0", purchase_date: "2017-06-10", state: "RS", category: "sports_leisure", payment_value: 154.30, status: "delivered", review: 4 },
    { order_id: "b455da4f612d3858c2f1624c7e651e06", purchase_date: "2017-06-11", state: "PR", category: "furniture_decor", payment_value: 178.60, status: "delivered", review: 4 },
    { order_id: "3e589895c2560ec0a8c2d5901358b532", purchase_date: "2017-06-12", state: "SP", category: "computers_accessories", payment_value: 320.10, status: "delivered", review: 5 },
    { order_id: "f489f6687498c199580436d4007b8b40", purchase_date: "2017-06-13", state: "SC", category: "garden_tools", payment_value: 145.90, status: "delivered", review: 4 },
    { order_id: "03549081bb99582c61617e455ca69c64", purchase_date: "2017-06-14", state: "RJ", category: "watches_gifts", payment_value: 198.40, status: "delivered", review: 2 },
    { order_id: "7400d4ef4b3c757c91726a4a6b29f796", purchase_date: "2017-06-15", state: "SP", category: "perfumery", payment_value: 182.30, status: "delivered", review: 5 },
    { order_id: "2d68718c37db2221bf584b42b3664a64", purchase_date: "2017-06-16", state: "MG", category: "bed_bath_table", payment_value: 165.70, status: "delivered", review: 4 },
    { order_id: "1c28b3b4f653066a3d90f23d458622f9", purchase_date: "2017-06-17", state: "SP", category: "health_beauty", payment_value: 129.80, status: "delivered", review: 5 },
    { order_id: "6e289895c2560ec0a8c2d5901358b991", purchase_date: "2017-06-18", state: "PE", category: "electronics", payment_value: 210.00, status: "delivered", review: 3 },
    { order_id: "9f381c265e18cb1dcee528d6e3831123", purchase_date: "2017-06-19", state: "RJ", category: "fashion_bags", payment_value: 94.50, status: "delivered", review: 4 },
    { order_id: "5b21c59c0840e6cb83a9ceb5573f8444", purchase_date: "2017-06-20", state: "SP", category: "auto", payment_value: 185.00, status: "delivered", review: 4 },
    { order_id: "7a81f51cbdc54678b7cc49136f2d6999", purchase_date: "2017-06-21", state: "DF", category: "office_furniture", payment_value: 310.40, status: "delivered", review: 5 }
  ]
};

export const MOCK_OVERVIEW_DATA: AnalysisResponse = {
  original_question: "Overview of Olist Marketplace Performance (May vs June 2017)",
  headline: "June Revenue Contracted 13.5% Driven by 12.2% Order Volume Drop",
  executive_summary: "June 2017 total marketplace GMV dropped from $590,704 in May to $511,276 (-13.5% MoM). Decomposition indicates this was overwhelmingly volume-driven: transactions fell from 3,695 to 3,245 (-12.2%), while Average Order Value (AOV) held steady at $157.56 (-1.4% MoM vs $159.83 in May). Regional contraction in São Paulo and a drop in repeat purchase frequency explain 68% of the net volume shortfall.",
  analysis_type: "Executive MoM Variance & Driver Decomposition",
  chat_answer: "Revenue declined primarily because order volume fell 12.2%, while AOV declined only 1.4%.\n\nThe current data confirms the mathematical driver, but not the underlying business cause. Key contributing factors include a 14.1% reduction in São Paulo orders and an 18.4% drop in repeat customer conversions.",
  kpis: [
    {
      label: "Revenue",
      value: "$511,276",
      change: "-13.5% MoM",
      trend: "down",
      period: "June vs May ($590,704)",
      sparkline: [590, 574, 552, 538, 524, 511],
      attribution: "Down -$79,428 MoM (89% volume-driven)",
      positiveIsGood: true
    },
    {
      label: "Orders",
      value: "3,245",
      change: "-12.2% MoM",
      trend: "down",
      period: "June vs May (3,695)",
      sparkline: [3695, 3580, 3450, 3360, 3290, 3245],
      attribution: "Shortfall of 450 orders across SE region",
      positiveIsGood: true
    },
    {
      label: "AOV",
      value: "$157.56",
      change: "-1.4% MoM",
      trend: "down",
      period: "June vs May ($159.83)",
      sparkline: [159.8, 160.2, 159.1, 158.4, 157.9, 157.5],
      attribution: "Price elasticity & basket size remained resilient",
      positiveIsGood: true
    },
    {
      label: "Customers",
      value: "3,100",
      change: "-10.8% MoM",
      trend: "down",
      period: "June vs May (3,475)",
      sparkline: [3475, 3390, 3280, 3210, 3160, 3100],
      attribution: "Repeat buyer cohort slowed significantly",
      positiveIsGood: true
    }
  ],
  key_drivers: [
    {
      driver: "Transaction Volume Drop",
      impact: "high",
      direction: "down",
      detail: "Order count fell by 450 units (-12.2%), contributing $71,920 (90.5%) of the total $79,428 revenue decline."
    },
    {
      driver: "São Paulo Market Softness",
      impact: "high",
      direction: "down",
      detail: "SP accounts for 37.4% of total GMV. SP order volume fell 14.1% MoM, representing 42% of national contraction."
    },
    {
      driver: "Repeat Customer Decay",
      impact: "medium",
      direction: "down",
      detail: "Repeat transactions fell from 754 to 615 (-18.4%), while first-time customer acquisition dropped 10.1%."
    },
    {
      driver: "AOV Resilience (Ruled Out Driver)",
      impact: "low",
      direction: "neutral",
      detail: "AOV contracted by just -$2.27 (-1.4%), confirming unit pricing and bundling were not significant degradation factors."
    }
  ],
  confirmed_findings: [
    "Revenue declined 13.5% in June (from $590,704 to $511,276)",
    "Order volume was the primary mathematical driver (-12.2% orders vs -1.4% AOV)",
    "São Paulo remains the largest customer market (37.4% share, $191,200)",
    "Health & Beauty was the #1 revenue category ($64,210 GMV)",
    "Delayed deliveries increased from 5.1% in May to 7.4% in June"
  ],
  ruled_out_or_weak_drivers: [
    "AOV collapse ruled out: Basket value shifted by only -$2.27 (-1.4%)",
    "Freight rate increases ruled out: Average shipping fee held flat at R$ 19.82 vs R$ 19.74",
    "Category mix shift ruled out: Top 5 categories maintained 54.1% aggregate share"
  ],
  remaining_uncertainties: [
    "Lack of paid marketing spend data in CSV prevents measuring CAC or channel ROAS changes",
    "External Brazilian holiday timing (Corpus Christi week in mid-June) may explain 3-day conversion dip",
    "Seller inventory stockouts not tracked in order transactions"
  ],
  recommended_actions: [
    {
      priority: "high",
      action: "Investigate São Paulo Seller Logistics",
      detail: "Audit fulfillment bottlenecks in Greater São Paulo hubs where shipping delays rose 2.3 percentage points."
    },
    {
      priority: "high",
      action: "Launch Win-Back Campaign for Repeat Buyers",
      detail: "Deploy targeted automated emails to 30-day dormant buyers who previously ordered in Q1."
    },
    {
      priority: "medium",
      action: "Audit Category Pricing in Watches & Gifts",
      detail: "Watches category had highest cancellation rate (3.2%); review merchant SLA and review scores."
    },
    {
      priority: "low",
      action: "Track Seller Stockout Telemetry",
      detail: "Incorporate catalog availability logs to differentiate demand drops from supply shortages."
    }
  ],
  confidence: 0.94,
  confidence_reason: "High statistical confidence: 100% order transaction coverage across May and June 2017 with zero missing order dates or payment totals.",
  visualizations: [
    {
      type: "line",
      title: "Revenue Over Time (May vs June 2017)",
      xKey: "date",
      yKeys: ["revenue_may", "revenue_june"],
      colors: ["#94A3B8", "#6366F1"],
      data: [
        { date: "Day 1-5", revenue_may: 95400, revenue_june: 84200 },
        { date: "Day 6-10", revenue_may: 102100, revenue_june: 88100 },
        { date: "Day 11-15", revenue_may: 98600, revenue_june: 82900 },
        { date: "Day 16-20", revenue_may: 104500, revenue_june: 86400 },
        { date: "Day 21-25", revenue_may: 99800, revenue_june: 85900 },
        { date: "Day 26-30", revenue_may: 90304, revenue_june: 83776 }
      ]
    },
    {
      type: "composed",
      title: "Orders vs AOV (Driver Comparison)",
      xKey: "metric",
      yKeys: ["may", "june"],
      colors: ["#CBD5E1", "#6366F1"],
      data: [
        { metric: "Orders (Hundreds)", may: 36.95, june: 32.45, change: "-12.2%" },
        { metric: "AOV ($)", may: 159.83, june: 157.56, change: "-1.4%" },
        { metric: "Customers (Hundreds)", may: 34.75, june: 31.00, change: "-10.8%" }
      ]
    },
    {
      type: "bar",
      title: "Revenue by State (Top 6)",
      xKey: "state",
      yKeys: ["revenue"],
      colors: ["#6366F1"],
      highlight_keys: ["SP", "RJ", "MG"],
      data: [
        { state: "SP", revenue: 191200, pct: "37.4%", orders: 1280 },
        { state: "RJ", revenue: 70560, pct: "13.8%", orders: 442 },
        { state: "MG", revenue: 57260, pct: "11.2%", orders: 368 },
        { state: "RS", revenue: 28120, pct: "5.5%", orders: 178 },
        { state: "PR", revenue: 25560, pct: "5.0%", orders: 162 },
        { state: "SC", revenue: 19430, pct: "3.8%", orders: 124 }
      ]
    },
    {
      type: "horizontal_bar",
      title: "Top Categories by Revenue",
      xKey: "category",
      yKeys: ["revenue"],
      colors: ["#6366F1"],
      data: [
        { category: "Health & Beauty", revenue: 64210, orders: 412 },
        { category: "Watches & Gifts", revenue: 58140, orders: 310 },
        { category: "Bed Bath Table", revenue: 51300, orders: 385 },
        { category: "Sports & Leisure", revenue: 46820, orders: 322 },
        { category: "Computers Acc.", revenue: 42150, orders: 245 }
      ]
    }
  ],
  evidence: [
    { claim: "June Revenue dropped -13.5% MoM", source: "Sum(payment_value), May $590.7k vs June $511.3k", confidence: 0.99, metric: "Revenue" },
    { claim: "Order volume accounted for 90.5% of decline", source: "Mathematical driver decomposition: ΔOrders × AOV_prior", confidence: 0.98, metric: "Orders" },
    { claim: "AOV was resilient (-1.4%)", source: "payment_value / count(order_id), $159.83 to $157.56", confidence: 0.97, metric: "AOV" },
    { claim: "São Paulo accounts for 37.4% of total GMV", source: "customer_state = 'SP' aggregate", confidence: 0.95, metric: "Geography" }
  ],
  follow_up_suggestions: [
    "Why did revenue decline in June?",
    "Which states contributed most?",
    "Did repeat customers decline?",
    "Check delivery performance",
    "Show category impact"
  ]
};

export const MOCK_INSIGHT_CARDS: InsightCardData[] = [
  {
    id: "ins_1",
    finding: "Revenue declined 13.5% in June",
    type: "Verified",
    confidence: 0.98,
    detail: "June GMV finished at $511,276, down -$79,428 compared to May ($590,704).",
    metric: "Revenue",
    actionLink: { view: "revenue", focus: "mom_waterfall" }
  },
  {
    id: "ins_2",
    finding: "Order volume was the primary mathematical driver",
    type: "Verified",
    confidence: 0.95,
    detail: "Orders fell 12.2% (from 3,695 to 3,245), explaining over 90% of the total revenue reduction.",
    metric: "Orders",
    actionLink: { view: "investigation", focus: "revenue_decline_tree" }
  },
  {
    id: "ins_3",
    finding: "AOV remained relatively stable (-1.4%)",
    type: "Verified",
    confidence: 0.96,
    detail: "Average basket value moved from $159.83 to $157.56, ruling out severe discounting or price deflation.",
    metric: "AOV",
    actionLink: { view: "products", focus: "price_elasticity" }
  },
  {
    id: "ins_4",
    finding: "São Paulo remains the largest customer market",
    type: "Association",
    confidence: 0.91,
    detail: "SP generated $191,200 (37.4% share), followed by Rio de Janeiro ($70,560) and Minas Gerais ($57,260).",
    metric: "Geography",
    actionLink: { view: "geography", focus: "revenue_by_state", highlight_keys: ["SP", "RJ", "MG"] }
  },
  {
    id: "ins_5",
    finding: "Late delivery spikes in SE region correlated with order cancellations",
    type: "Hypothesis",
    confidence: 0.78,
    detail: "Delivery delays rose from 5.1% to 7.4%, correlating with a 38% rise in buyer cancellations in RJ and SP.",
    metric: "Operations",
    actionLink: { view: "operations", focus: "delayed_shipments" }
  }
];

export const MOCK_INVESTIGATION_TREE: InvestigationNode = {
  id: "root",
  title: "Revenue Decline",
  change: "↓ 13.5% (-$79.4k)",
  direction: "down",
  status: "primary_driver",
  impactPercentage: 100,
  description: "Total marketplace GMV contracted from $590,704 in May to $511,276 in June.",
  children: [
    {
      id: "orders",
      title: "Order Volume",
      change: "↓ 12.2% (-450 orders)",
      direction: "down",
      status: "primary_driver",
      impactPercentage: 90.5,
      description: "Primary mathematical driver: volume dropped from 3,695 to 3,245 orders.",
      children: [
        {
          id: "sp_orders",
          title: "São Paulo Orders",
          change: "↓ 14.1% (-210 orders)",
          direction: "down",
          status: "primary_driver",
          impactPercentage: 42,
          description: "SP order conversion softened noticeably during mid-month weeks 2 and 3."
        },
        {
          id: "repeat_customers",
          title: "Repeat Customers",
          change: "↓ 18.4% (-139 orders)",
          direction: "down",
          status: "secondary_driver",
          impactPercentage: 26,
          description: "Repeat customer transaction frequency decayed from 20.4% to 18.9% of total mix."
        }
      ]
    },
    {
      id: "aov",
      title: "Average Order Value (AOV)",
      change: "↓ 1.4% (-$2.27)",
      direction: "neutral",
      status: "ruled_out",
      impactPercentage: 9.5,
      description: "Ruled out as a major driver. Basket size dropped negligibly from $159.83 to $157.56."
    }
  ]
};

export const MOCK_AI_RESPONSES: Record<string, Partial<AnalysisResponse>> = {
  "Why did revenue decline in June?": {
    original_question: "Why did revenue decline in June?",
    headline: "Order Volume Contraction Was the Primary Mathematical Driver (-12.2%)",
    executive_summary: "Revenue declined primarily because order volume fell 12.2%, while AOV declined only 1.4%.\n\nThe current data confirms the mathematical driver, but not the underlying business cause. Volume dropped by 450 orders, which mathematically accounts for $71,920 (90.5%) of the total $79,428 revenue decline.",
    chat_answer: "Revenue declined primarily because order volume fell 12.2%, while AOV declined only 1.4%.\n\nThe current data confirms the mathematical driver, but not the underlying business cause.\n\nKey supporting evidence:\n• Orders dropped from 3,695 to 3,245 (-12.2%)\n• AOV fell only $2.27 from $159.83 to $157.56 (-1.4%)\n• Regional orders in São Paulo alone fell 14.1%",
    confidence: 0.95,
    confidence_reason: "Mathematical decomposition of Revenue = Orders × AOV isolates volume as 90.5% contributor.",
    workspace_action: {
      view: "investigation",
      focus: "revenue_decline_tree"
    },
    evidence: [
      { claim: "Revenue dropped -13.5%", source: "May $590.7k vs June $511.3k", confidence: 0.99, metric: "Revenue" },
      { claim: "Orders fell -12.2%", source: "May 3,695 vs June 3,245 orders", confidence: 0.98, metric: "Orders" },
      { claim: "AOV changed by -1.4%", source: "May $159.83 vs June $157.56", confidence: 0.96, metric: "AOV" }
    ],
    follow_up_suggestions: [
      "Which states contributed most?",
      "Did repeat customers decline?",
      "Check delivery performance",
      "Show category impact"
    ]
  },
  "Which states contributed most?": {
    original_question: "Which states contributed most?",
    headline: "São Paulo, Rio de Janeiro & Minas Gerais Account for 62.4% of Revenue",
    executive_summary: "Southeast Brazil dominates platform GMV. São Paulo (SP) alone generated $191,200 (37.4%), followed by Rio de Janeiro (RJ) with $70,560 (13.8%) and Minas Gerais (MG) with $57,260 (11.2%). However, SP also accounted for 42% of the net order decline in June.",
    chat_answer: "São Paulo (SP) is the largest market by far, contributing $191,200 (37.4% of total revenue).\n\nTogether with Rio de Janeiro (RJ, $70.5k) and Minas Gerais (MG, $57.3k), these top 3 states represent 62.4% of total marketplace GMV.\n\nCrucially, São Paulo experienced a 14.1% decline in orders in June, making it the biggest regional contributor to the overall revenue dip.",
    confidence: 0.94,
    confidence_reason: "Customer state is populated for 100% of orders with zero null entries.",
    workspace_action: {
      view: "geography",
      focus: "revenue_by_state",
      highlight_keys: ["SP", "RJ", "MG"]
    },
    evidence: [
      { claim: "SP Revenue: $191,200 (37.4%)", source: "state = 'SP'", confidence: 0.99, metric: "Revenue" },
      { claim: "RJ Revenue: $70,560 (13.8%)", source: "state = 'RJ'", confidence: 0.98, metric: "Revenue" },
      { claim: "MG Revenue: $57,260 (11.2%)", source: "state = 'MG'", confidence: 0.97, metric: "Revenue" }
    ],
    follow_up_suggestions: [
      "Did repeat customers decline?",
      "Check delivery performance",
      "Show category impact",
      "Why did revenue decline in June?"
    ]
  },
  "Did repeat customers decline?": {
    original_question: "Did repeat customers decline?",
    headline: "Repeat Buyers Contracted 18.4% MoM (From 754 to 615 Orders)",
    executive_summary: "Yes. Repeat customer transactions experienced a sharp 18.4% contraction in June, falling from 754 orders in May to 615 in June. First-time buyers also dropped from 2,941 to 2,630 (-10.6%). Repeat customer share shrank from 20.4% to 18.9% of total order volume.",
    chat_answer: "Yes, repeat customer orders fell 18.4% in June (down from 754 in May to 615).\n\nThis outpaced the decline in first-time customers (-10.6%). As a result, repeat customer share fell from 20.4% to 18.9%.\n\nCohort analysis reveals lower 30-day re-engagement from customers who made initial purchases in April and May.",
    confidence: 0.92,
    confidence_reason: "Customer unique ID mapping identifies first-time vs repeat order instances.",
    workspace_action: {
      view: "customers",
      focus: "repeat_cohorts"
    },
    evidence: [
      { claim: "Repeat orders fell -18.4%", source: "754 in May vs 615 in June", confidence: 0.95, metric: "Customers" },
      { claim: "First-time buyers fell -10.6%", source: "2,941 in May vs 2,630 in June", confidence: 0.94, metric: "Customers" },
      { claim: "Repeat share dropped to 18.9%", source: "Repeat mix ratio", confidence: 0.93, metric: "Mix" }
    ],
    follow_up_suggestions: [
      "Check delivery performance",
      "Which states contributed most?",
      "Show category impact",
      "Why did revenue decline in June?"
    ]
  },
  "Check delivery performance": {
    original_question: "Check delivery performance",
    headline: "Delayed Deliveries Rose from 5.1% to 7.4% Correlating with NPS Drop",
    executive_summary: "Operational delivery performance deteriorated in June. The percentage of orders delivered after the estimated delivery date increased from 5.1% in May to 7.4% in June (+2.3 pp). Late orders had an average review score of 1.7 stars versus 4.3 stars for on-time deliveries.",
    chat_answer: "Delivery delays rose from 5.1% in May to 7.4% in June.\n\nOn average, transit times increased by 1.8 days in the Southeast corridor (São Paulo and Rio de Janeiro).\n\nImpact on review scores:\n• On-time deliveries: 4.32 / 5.0 rating\n• Delayed deliveries: 1.74 / 5.0 rating\n• Cancellation rate for delayed shipments surged to 3.8%",
    confidence: 0.91,
    confidence_reason: "Calculated comparing order_delivered_customer_date against order_estimated_delivery_date.",
    workspace_action: {
      view: "operations",
      focus: "delayed_shipments"
    },
    evidence: [
      { claim: "Late deliveries rose to 7.4%", source: "Delivered > Estimated date", confidence: 0.96, metric: "Operations" },
      { claim: "Review score on late orders: 1.74", source: "review_score for delayed subset", confidence: 0.95, metric: "Reviews" },
      { claim: "SE corridor transit delay: +1.8 days", source: "Carrier transit delta", confidence: 0.89, metric: "Logistics" }
    ],
    follow_up_suggestions: [
      "Which states contributed most?",
      "Show category impact",
      "Why did revenue decline in June?",
      "Did repeat customers decline?"
    ]
  },
  "Show category impact": {
    original_question: "Show category impact",
    headline: "Health & Beauty Remains Top Category at $64.2k GMV",
    executive_summary: "Health & Beauty ($64,210), Watches & Gifts ($58,140), and Bed Bath & Table ($51,300) remained the 3 largest revenue contributors in June. However, Computers Accessories experienced the steepest contraction (-18.2% MoM) due to merchant stockouts.",
    chat_answer: "Here is the category performance breakdown for June:\n\n1. Health & Beauty: $64,210 (-8.4% MoM)\n2. Watches & Gifts: $58,140 (-11.2% MoM)\n3. Bed Bath Table: $51,300 (-13.1% MoM)\n4. Sports & Leisure: $46,820 (-9.5% MoM)\n5. Computers & Accessories: $42,150 (-18.2% MoM)\n\nCategory rankings remained stable, confirming that revenue decline was broad-based rather than isolated to one category.",
    confidence: 0.93,
    confidence_reason: "Product category assigned to 98.6% of items.",
    workspace_action: {
      view: "products",
      focus: "category_breakdown"
    },
    evidence: [
      { claim: "Health & Beauty GMV: $64,210", source: "category = 'health_beauty'", confidence: 0.98, metric: "Products" },
      { claim: "Computers Accessories fell -18.2%", source: "MoM category comparison", confidence: 0.94, metric: "Products" }
    ],
    follow_up_suggestions: [
      "Why did revenue decline in June?",
      "Which states contributed most?",
      "Did repeat customers decline?",
      "Check delivery performance"
    ]
  }
};
