export default function LoginPage() {
  return (
    <div className="min-h-screen bg-primary-600 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-6">
        {/* Logo / App name */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary-700">POS ហាង</h1>
          <p className="text-sm text-slate-500">ប្រព័ន្ធគ្រប់គ្រងការលក់</p>
        </div>

        {/* Login form — wired in auth feature task */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              អ៊ីមែល
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full h-12 px-4 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              លេខសម្ងាត់
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full h-12 px-4 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="button"
            className="w-full h-12 bg-primary-600 text-white font-semibold rounded-xl active:bg-primary-700 transition-colors"
          >
            ចូលប្រើ
          </button>
        </div>
      </div>
    </div>
  )
}
