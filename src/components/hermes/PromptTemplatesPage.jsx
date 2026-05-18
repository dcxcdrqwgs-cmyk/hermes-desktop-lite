// Copyright (c) 2026 MeeJoy

import { useCallback, useMemo, useState } from "react"
import {
  BookOpenIcon,
  CrownIcon,
  FilterIcon,
  LockIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  UnlockIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ViewFrame } from "@/components/view-frame"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const TEMPLATE_CATEGORIES = [
  { id: "all", label: "全部", icon: FilterIcon },
  { id: "general", label: "通用", icon: BookOpenIcon },
  { id: "coding", label: "编程", icon: SparklesIcon },
  { id: "writing", label: "写作", icon: BookOpenIcon },
  { id: "business", label: "商务", icon: CrownIcon },
  { id: "creative", label: "创意", icon: StarIcon },
]

const FREE_TEMPLATES = [
  {
    id: "general-chat",
    name: "通用对话",
    description: "适用于日常对话和问答的基础 Prompt 模板",
    category: "general",
    tags: ["基础", "通用"],
    type: "free",
    prompt: "你是一个有用的AI助手，请用清晰、准确的语言回答用户的问题。",
    usageCount: 1280,
    rating: 4.5,
  },
  {
    id: "code-assistant",
    name: "编程助手",
    description: "帮助编写、调试和优化代码的专业模板",
    category: "coding",
    tags: ["编程", "调试"],
    type: "free",
    prompt: "你是一个专业的编程助手，擅长多种编程语言。请帮助用户编写、调试和优化代码。",
    usageCount: 960,
    rating: 4.7,
  },
  {
    id: "writing-helper",
    name: "写作助手",
    description: "辅助写作、润色和改写文本的通用模板",
    category: "writing",
    tags: ["写作", "润色"],
    type: "free",
    prompt: "你是一个专业的写作助手，帮助用户改进文章结构、润色语言、提供写作建议。",
    usageCount: 720,
    rating: 4.3,
  },
  {
    id: "translator",
    name: "翻译专家",
    description: "支持多语言翻译的专业模板",
    category: "general",
    tags: ["翻译", "多语言"],
    type: "free",
    prompt: "你是一个专业的翻译专家，能够准确翻译多种语言，并保持原文的风格和含义。",
    usageCount: 850,
    rating: 4.6,
  },
  {
    id: "data-analyst",
    name: "数据分析",
    description: "帮助分析和可视化的数据专家模板",
    category: "business",
    tags: ["数据", "分析"],
    type: "free",
    prompt: "你是一个数据分析专家，能够帮助用户分析数据、发现趋势、提供可视化建议。",
    usageCount: 540,
    rating: 4.4,
  },
  {
    id: "creative-writer",
    name: "创意写作",
    description: "激发创意和想象力的写作模板",
    category: "creative",
    tags: ["创意", "故事"],
    type: "free",
    prompt: "你是一个富有创意的写作助手，能够帮助用户创作故事、诗歌、剧本等创意内容。",
    usageCount: 380,
    rating: 4.2,
  },
]

const PAID_TEMPLATES = [
  {
    id: "business-strategy",
    name: "商业策略专家",
    description: "专业商业分析和战略规划的高级模板",
    category: "business",
    tags: ["商业", "策略", "专业"],
    type: "paid",
    price: 29.9,
    prompt: "你是一位资深的商业策略顾问，拥有丰富的行业经验。请基于市场分析、竞争环境和资源能力，为用户提供专业的商业策略建议。",
    usageCount: 320,
    rating: 4.9,
    features: ["行业定制", "案例分析", "风险评估"],
  },
  {
    id: "legal-advisor",
    name: "法律顾问",
    description: "专业法律咨询和合同审查的高级模板",
    category: "business",
    tags: ["法律", "合同", "专业"],
    type: "paid",
    price: 39.9,
    prompt: "你是一位经验丰富的法律顾问，精通各类法律法规。请为用户提供专业的法律咨询、合同审查和风险评估服务。",
    usageCount: 210,
    rating: 4.8,
    features: ["合同审查", "法律咨询", "风险预警"],
  },
  {
    id: "medical-expert",
    name: "医疗专家",
    description: "专业医疗咨询和健康管理的高级模板",
    category: "business",
    tags: ["医疗", "健康", "专业"],
    type: "paid",
    price: 49.9,
    prompt: "你是一位资深的医疗专家，拥有丰富的临床经验。请为用户提供专业的医疗咨询、健康管理建议和疾病预防指导。",
    usageCount: 180,
    rating: 4.9,
    features: ["健康咨询", "疾病预防", "用药指导"],
  },
  {
    id: "financial-analyst",
    name: "金融分析师",
    description: "专业金融分析和投资建议的高级模板",
    category: "business",
    tags: ["金融", "投资", "专业"],
    type: "paid",
    price: 34.9,
    prompt: "你是一位资深的金融分析师，精通各类金融产品和市场分析。请为用户提供专业的投资建议、风险评估和资产配置方案。",
    usageCount: 250,
    rating: 4.7,
    features: ["投资分析", "风险评估", "资产配置"],
  },
  {
    id: "creative-director",
    name: "创意总监",
    description: "专业品牌策划和创意设计的高级模板",
    category: "creative",
    tags: ["品牌", "创意", "设计"],
    type: "paid",
    price: 44.9,
    prompt: "你是一位资深的创意总监，拥有丰富的品牌策划和创意设计经验。请为用户提供专业的品牌定位、创意方案和视觉设计建议。",
    usageCount: 190,
    rating: 4.8,
    features: ["品牌策划", "创意设计", "视觉方案"],
  },
]

function normalizeText(value) {
  return String(value || "").trim().toLowerCase()
}

function itemMatchesQuery(item, query) {
  const normalized = normalizeText(query)
  if (!normalized) return true

  return [
    item?.name,
    item?.description,
    item?.category,
    ...(Array.isArray(item?.tags) ? item.tags : []),
  ].some((field) => normalizeText(field).includes(normalized))
}

function TemplateCard({ template, onUse, onPreview }) {
  const { t } = useI18n()
  const isPaid = template.type === "paid"

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        isPaid && "border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30"
      )}
    >
      {isPaid && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
            <CrownIcon className="size-3 mr-1" />
            付费
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {template.name}
              {isPaid ? (
                <LockIcon className="size-4 text-amber-500" />
              ) : (
                <UnlockIcon className="size-4 text-green-500" />
              )}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {template.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <TagIcon className="size-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <StarIcon className="size-3.5 fill-yellow-400 text-yellow-400" />
              {template.rating}
            </span>
            <span>{template.usageCount} 次使用</span>
          </div>
          {isPaid && (
            <span className="font-semibold text-foreground">
              ¥{template.price}
            </span>
          )}
        </div>

        {isPaid && template.features && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.features.map((feature) => (
              <Badge key={feature} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onPreview?.(template)}
          >
            预览
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onUse?.(template)}
            variant={isPaid ? "default" : "default"}
          >
            {isPaid ? "购买使用" : "免费使用"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PromptTemplatesPage() {
  const { t } = useI18n()
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("free")
  const [previewTemplate, setPreviewTemplate] = useState(null)

  const filteredFreeTemplates = useMemo(() => {
    let templates = FREE_TEMPLATES

    if (activeCategory !== "all") {
      templates = templates.filter((t) => t.category === activeCategory)
    }

    if (searchQuery) {
      templates = templates.filter((t) => itemMatchesQuery(t, searchQuery))
    }

    return templates
  }, [activeCategory, searchQuery])

  const filteredPaidTemplates = useMemo(() => {
    let templates = PAID_TEMPLATES

    if (activeCategory !== "all") {
      templates = templates.filter((t) => t.category === activeCategory)
    }

    if (searchQuery) {
      templates = templates.filter((t) => itemMatchesQuery(t, searchQuery))
    }

    return templates
  }, [activeCategory, searchQuery])

  const handleUseTemplate = useCallback((template) => {
    if (template.type === "paid") {
      toast.info("付费模板购买功能即将上线")
    } else {
      navigator.clipboard.writeText(template.prompt)
      toast.success("Prompt 已复制到剪贴板")
    }
  }, [])

  const handlePreview = useCallback((template) => {
    setPreviewTemplate(template)
  }, [])

  return (
    <ViewFrame
      title="Prompt 市场"
      description="浏览和使用专业的 Prompt 模板，提升 AI 对话效果"
    >
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "free" ? "default" : "outline"}
          onClick={() => setActiveTab("free")}
          className="flex items-center gap-2"
        >
          <UnlockIcon className="size-4" />
          免费模板
          <Badge variant="secondary" className="ml-1">
            {filteredFreeTemplates.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "paid" ? "default" : "outline"}
          onClick={() => setActiveTab("paid")}
          className="flex items-center gap-2"
        >
          <CrownIcon className="size-4" />
          付费模板
          <Badge variant="secondary" className="ml-1">
            {filteredPaidTemplates.length}
          </Badge>
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map((category) => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="flex items-center gap-1.5"
              >
                <Icon className="size-3.5" />
                {category.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 模板说明 */}
      <div className="mb-6">
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {activeTab === "free" ? (
                <UnlockIcon className="size-5 text-green-500 mt-0.5" />
              ) : (
                <CrownIcon className="size-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <h4 className="font-medium">
                  {activeTab === "free" ? "免费模板" : "付费模板"}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "free"
                    ? "这些模板完全免费，适用于日常使用和学习。点击即可复制 Prompt 到剪贴板。"
                    : "这些模板由专业人士制作，针对特定行业和场景进行了优化。购买后可永久使用。"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTab === "free"
          ? filteredFreeTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleUseTemplate}
                onPreview={handlePreview}
              />
            ))
          : filteredPaidTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleUseTemplate}
                onPreview={handlePreview}
              />
            ))}
      </div>

      {/* 空状态 */}
      {((activeTab === "free" && filteredFreeTemplates.length === 0) ||
        (activeTab === "paid" && filteredPaidTemplates.length === 0)) && (
        <div className="text-center py-12">
          <SearchIcon className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">没有找到匹配的模板</h3>
          <p className="text-muted-foreground mt-1">
            尝试调整搜索条件或选择其他分类
          </p>
        </div>
      )}

      {/* 预览对话框 */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{previewTemplate.name}</CardTitle>
                  <CardDescription>{previewTemplate.description}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Prompt 内容</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {previewTemplate.prompt}
                    </pre>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <StarIcon className="size-4 fill-yellow-400 text-yellow-400" />
                    {previewTemplate.rating}
                  </span>
                  <span>{previewTemplate.usageCount} 次使用</span>
                  {previewTemplate.type === "paid" && (
                    <span className="font-semibold text-foreground">
                      ¥{previewTemplate.price}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
            <div className="border-t p-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewTemplate(null)}
              >
                关闭
              </Button>
              <Button onClick={() => handleUseTemplate(previewTemplate)}>
                {previewTemplate.type === "paid" ? "购买使用" : "免费使用"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      </div>
    </ViewFrame>
  )
}
