import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { profile } from '../data/content.js'

/**
 * Contact page: a form that emails you via Web3Forms (no backend, no database),
 * plus direct contact links. Every submission arrives in your inbox with the
 * subject "Portfolio Contact — <name>" so you can filter/label it in Gmail.
 */
const WEB3FORMS_KEY = '7088f08a-2edc-4456-b557-32eec37e53aa'

// Edit these to your real handles
const LINKS = {
  email: 'slavkoljubojevic01@gmail.com',
  linkedin: 'https://www.linkedin.com/in/slavko-ljubojevic-0525b833b/',
  github: 'https://github.com/Slavkoo01',
}

export default function Contact() {
  const [status, setStatus] = useState('idle') // idle | sending | ok | error
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('sending'); setErrorMsg('')

    const formData = new FormData(e.target)
    formData.append('access_key', WEB3FORMS_KEY)
    // customise how it looks in your inbox
    formData.append('subject', `Portfolio Contact — ${formData.get('name') || 'someone'}`)
    formData.append('from_name', 'Portfolio Website')

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setStatus('ok')
        e.target.reset()
      } else {
        setStatus('error')
        setErrorMsg(data.message || 'Something went wrong.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg('Network error — please try again.')
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-28 pb-20 relative overflow-hidden">
        {/* ambient glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 right-1/4 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-neon-violet/10 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon-violet mb-2">Contact</p>
            <h1 className="font-display text-4xl font-bold">Get In Touch</h1>
            <p className="text-white/50 mt-2 max-w-lg">
              Have a project in mind or just want to say hi? Send a message below, or reach me directly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Form */}
            <div className="glass rounded-2xl p-8">
              {status === 'ok' ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-4">✦</div>
                  <h3 className="font-display text-xl font-semibold mb-2">Message sent!</h3>
                  <p className="text-white/50 text-sm">Thanks for reaching out — I'll get back to you soon.</p>
                  <button onClick={() => setStatus('idle')}
                    className="mt-6 rounded-full glass px-5 py-2 text-sm hover:bg-white/10 transition">
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">Name</label>
                      <input name="name" type="text" required
                        className="cinput" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">Email</label>
                      <input name="email" type="email" required
                        className="cinput" placeholder="you@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2">Subject</label>
                    <input name="user_subject" type="text"
                      className="cinput" placeholder="What's this about?" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2">Message</label>
                    <textarea name="message" rows={5} required
                      className="cinput resize-none" placeholder="Tell me about your project…" />
                  </div>

                  {/* honeypot: bots fill this, humans don't → silently rejected by Web3Forms */}
                  <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

                  {status === 'error' && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                      {errorMsg}
                    </div>
                  )}

                  <button type="submit" disabled={status === 'sending'}
                    className="rounded-xl bg-gradient-to-r from-neon-violet to-neon-magenta px-7 py-3 font-medium shadow-lg shadow-neon-violet/25 hover:shadow-neon-violet/40 transition disabled:opacity-50">
                    {status === 'sending' ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Direct links */}
            <div className="space-y-4">
              <ContactLink icon="✉" label="Email" value={LINKS.email} href={`mailto:${LINKS.email}`} />
              <ContactLink icon="in" label="LinkedIn" value="Connect with me" href={LINKS.linkedin} />
              <ContactLink icon="⌥" label="GitHub" value={LINKS.github.replace('https://github.com/', '@')} href={LINKS.github} />
            </div>
          </div>
        </div>

        <style>{`
          .cinput{width:100%;border-radius:0.75rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:0.75rem 1rem;font-size:0.875rem;outline:none;color:white;transition:all .2s}
          .cinput:focus{border-color:rgba(198,92,255,0.5);background:rgba(255,255,255,0.06)}
        `}</style>
      </main>
    </>
  )
}

function ContactLink({ icon, label, value, href }) {
  const external = href.startsWith('http')
  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
      className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-white/[0.06] transition group">
      <div className="w-11 h-11 rounded-xl bg-neon-violet/15 flex items-center justify-center text-neon-violet font-semibold shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-white/40">{label}</div>
        <div className="text-sm text-white/80 truncate group-hover:text-white transition">{value}</div>
      </div>
    </a>
  )
}
