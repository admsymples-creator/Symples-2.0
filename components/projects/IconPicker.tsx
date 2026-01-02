"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Folder,
  FolderOpen,
  Briefcase,
  Building,
  Rocket,
  Target,
  Zap,
  Lightbulb,
  Code,
  Palette,
  Music,
  Camera,
  Video,
  FileText,
  Image,
  Package,
  ShoppingBag,
  Heart,
  Star,
  Flag,
  Trophy,
  Award,
  Gift,
  Diamond,
  Crown,
  Sparkles,
  Wand2,
  Gem,
  Circle,
  Hexagon,
  LucideIcon,
} from "lucide-react";

// Lista de 30 ícones minimalistas
const PROJECT_ICONS: Array<{ name: string; icon: LucideIcon }> = [
  { name: "Folder", icon: Folder },
  { name: "FolderOpen", icon: FolderOpen },
  { name: "Briefcase", icon: Briefcase },
  { name: "Building", icon: Building },
  { name: "Rocket", icon: Rocket },
  { name: "Target", icon: Target },
  { name: "Zap", icon: Zap },
  { name: "Lightbulb", icon: Lightbulb },
  { name: "Code", icon: Code },
  { name: "Palette", icon: Palette },
  { name: "Music", icon: Music },
  { name: "Camera", icon: Camera },
  { name: "Video", icon: Video },
  { name: "FileText", icon: FileText },
  { name: "Image", icon: Image },
  { name: "Package", icon: Package },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Heart", icon: Heart },
  { name: "Star", icon: Star },
  { name: "Flag", icon: Flag },
  { name: "Trophy", icon: Trophy },
  { name: "Award", icon: Award },
  { name: "Gift", icon: Gift },
  { name: "Diamond", icon: Diamond },
  { name: "Crown", icon: Crown },
  { name: "Sparkles", icon: Sparkles },
  { name: "Wand2", icon: Wand2 },
  { name: "Gem", icon: Gem },
  { name: "Circle", icon: Circle },
  { name: "Hexagon", icon: Hexagon },
];

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (iconName: string) => void;
}

export function IconPicker({ selectedIcon, onIconSelect }: IconPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Ícone do Projeto</label>
      <div className="grid grid-cols-6 gap-2 p-1 border border-gray-200 rounded-md">
        {PROJECT_ICONS.map(({ name, icon: Icon }) => {
          const isSelected = selectedIcon === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onIconSelect(name)}
              className={cn(
                "w-12 h-12 rounded-lg bg-[#050815] flex items-center justify-center text-white transition-all",
                "hover:scale-105 hover:shadow-md",
                isSelected && "ring-2 ring-blue-500 ring-offset-2"
              )}
              aria-label={`Selecionar ícone ${name}`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helper function para obter componente de ícone pelo nome
 */
export function getIconComponent(iconName: string): LucideIcon {
  const iconData = PROJECT_ICONS.find((item) => item.name === iconName);
  return iconData?.icon || Folder; // Fallback para Folder
}

