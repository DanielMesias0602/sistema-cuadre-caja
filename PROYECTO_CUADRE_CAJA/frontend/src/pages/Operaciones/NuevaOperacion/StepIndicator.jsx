export function StepIndicator({ currentStep, totalSteps }) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step === currentStep
                  ? 'bg-brand-orange text-white shadow-md'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
              }`}
            >
              {step < currentStep ? '✓' : step}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-1 mx-1 rounded transition-all ${
                  step < currentStep ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
