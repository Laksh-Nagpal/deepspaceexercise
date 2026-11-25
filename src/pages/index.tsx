import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Seo } from '../components/Seo'
import { seo } from '../seo'
import { Court } from '../features/matches/Court'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div className="landing" data-testid="static-landing">
        <nav className="landing-nav">
          <span className="brand">
            Rally<b>IQ</b>
          </span>
          <Link to="/home">Your match workspace ↗</Link>
        </nav>
        <main className="landing-hero">
          <div>
            <span className="eyebrow">A CLEARER VIEW OF YOUR GAME</span>
            <h1>
              Find your edge.
              <br />
              <em>Point by point.</em>
            </h1>
            <p>
              Go beyond the score. Record every shot, replay the buildup,
              and understand what created each point.
            </p>
            <Link className="landing-cta" to="/home">
              Open your match notebook <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="landing-art">
            <Court points={[]} />
          </div>
        </main>
        <footer className="landing-foot">
          <span>01 / Record each point</span>
          <span>02 / See your shot placement</span>
          <span>03 / Understand the match</span>
          <span>RallyIQ · The courtside notebook</span>
        </footer>
      </div>
    </>
  )
}
