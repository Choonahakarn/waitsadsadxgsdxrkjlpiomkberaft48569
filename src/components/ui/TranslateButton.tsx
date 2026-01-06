import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface TranslateButtonProps {
  text: string;
  onTranslated: (translatedText: string) => void;
}

export function TranslateButton({ text, onTranslated }: TranslateButtonProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const { i18n, t } = useTranslation();

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text,
          targetLanguage: i18n.language,
        },
      });

      if (error) throw error;
      
      if (data?.translatedText) {
        onTranslated(data.translatedText);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleTranslate}
      disabled={isTranslating}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      {isTranslating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Languages className="h-4 w-4" />
      )}
      {isTranslating 
        ? t('common.translating', 'กำลังแปล...') 
        : t('common.translateTo', { lang: i18n.language === 'th' ? 'ไทย' : 'English' })
      }
    </Button>
  );
}
