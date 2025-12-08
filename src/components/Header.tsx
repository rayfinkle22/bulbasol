import snailImage from "@/assets/snail.png";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b-4 border-primary/30">
      <div className="max-w-6xl mx-auto px-3 py-2 sm:py-3">
        <div className="flex items-center justify-center gap-2">
          <img src={snailImage} alt="Snail" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          <span className="font-display text-xl sm:text-2xl font-bold text-primary">$SNAIL</span>
        </div>
      </div>
    </header>
  );
};
