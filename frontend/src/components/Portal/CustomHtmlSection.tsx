import './CustomHtmlSection.css';

interface CustomHtmlSectionProps {
  config: {
    htmlContent?: string;
    cssStyle?: string;
  };
}

export default function CustomHtmlSection({ config }: CustomHtmlSectionProps) {
  const { htmlContent = '', cssStyle = '' } = config;

  return (
    <div className="custom-html-section">
      {cssStyle && <style>{cssStyle}</style>}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
}
