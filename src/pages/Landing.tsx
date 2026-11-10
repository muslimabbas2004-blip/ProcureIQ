import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import Brand from '../components/Brand';
import ProcurementNetwork from './ProcurementNetwork';
import { LandingSpotlight, ProcurementTrace } from './LandingSignals';

const features = [
  { title: 'Ask a better question', text: 'Explore procurement data in plain language and get clear, grounded answers.', tag: 'AI ASSISTANT' },
  { title: 'Know your suppliers', text: 'Bring supplier activity, purchase orders, and spending into one view.', tag: 'SUPPLIER INSIGHTS' },
  { title: 'Understand every price', text: 'Compare prices across suppliers and spot opportunities in your history.', tag: 'PRICE INTELLIGENCE' },
  { title: 'See the bigger picture', text: 'Turn purchasing records into trends, categories, and meaningful metrics.', tag: 'SPEND ANALYTICS' },
];
function Preview() {
  return <div className="intelligence-plate" aria-label="Illustration of connected procurement intelligence">
    <div className="plate-header"><span>PROCUREIQ / INTELLIGENCE MAP</span><span>FIG. 01 — CONNECTED VIEW</span></div>
    <div className="clarity-map">
      <p className="clarity-intro">Your procurement, connected</p>
      <div className="clarity-grid">
        <div className="clarity-item"><span>01</span><strong>Suppliers</strong><small>Know who you work with</small></div>
        <div className="clarity-item"><span>02</span><strong>Materials</strong><small>See what you purchase</small></div>
        <div className="clarity-item"><span>03</span><strong>Purchase orders</strong><small>Follow your activity</small></div>
        <div className="clarity-item"><span>04</span><strong>Price intelligence</strong><small>Understand your costs</small></div>
      </div>
      <div className="clarity-outcome"><span className="clarity-outcome-mark" aria-hidden="true">↗</span><div><strong>One clear picture</strong><p>Turn your records into better decisions.</p></div></div>
    </div><div className="plate-footer"><span>FROM FRAGMENTS TO FORESIGHT</span><span>PROCUREMENT, IN CONTEXT</span></div>
  </div>;
}

export default function Landing() {
  return <div className="landing-page">
    <header className="landing-header">
      <nav className="landing-nav" aria-label="Main navigation">
        <Brand tagline />
        <div className="landing-nav-links"><a href="#features">Why ProcureIQ</a><a href="#how-it-works">How it works</a></div>
        <Link to="/login" className="landing-nav-cta">Sign in <ArrowRight size={15} /></Link>
      </nav>
    </header>
    <main className="landing-scene">
      <LandingSpotlight />
      <section className="landing-hero">
        <ProcurementNetwork />
        <div className="landing-hero-inner">
          <div className="landing-copy">
            <div className="landing-kicker"><span /><span>MEET YOUR PROCUREMENT WORKSPACE</span></div>
            <h1>Better decisions<br /><em>start here.</em></h1>
            <p>Your purchasing data has a story to tell. Bring suppliers, spend, and pricing together to see what matters and act with confidence.</p>
            <div className="landing-actions">
              <Link to="/login" className="landing-primary">Explore the workspace <ArrowRight size={18} /></Link>
              <a href="#features" className="landing-secondary">See what’s possible <span>↓</span></a>
            </div>
            <div className="landing-note"><span><Check size={14} /></span> One clear view of your procurement data</div>
          </div>
          <Preview />
        </div>
      </section>
      <section className="landing-features" id="features">
        <ProcurementTrace />
        <div className="landing-section-heading"><div><span className="landing-label">MADE FOR BETTER DECISIONS</span><h2>Everything you need.<br/><em>Nothing in your way.</em></h2></div><p>From the first question to your next decision, find the context you need without digging through spreadsheets.</p></div><div className="feature-index">{features.map(({title,text,tag},i)=><article className="feature-row" key={title}><div className="feature-number">0{i+1}<span> / 04</span></div><div className="feature-name"><span>{tag}</span><h3>{title}</h3></div><p>{text}</p><span className="feature-rule" aria-hidden="true" /></article>)}</div>
      </section>
      <section className="landing-how" id="how-it-works">
        <ProcurementTrace workflow />
        <div><span className="landing-label">SIMPLE BY DESIGN</span><h2>From data to direction.</h2><p>Start with the records you already have and find answers that move your work forward.</p></div><div className="landing-steps"><div><span>01</span><strong>Bring your data together</strong><p>Import supplier, item, and purchasing records.</p></div><div><span>02</span><strong>Explore what matters</strong><p>Browse trends, compare prices, or ask a question.</p></div><div><span>03</span><strong>Make your next move</strong><p>Use the context to make informed decisions.</p></div></div>
      </section>
      <section className="landing-bottom"><div><span className="landing-label">READY WHEN YOU ARE</span><h2>Let’s make every purchase<br/>a little smarter.</h2><p>Your procurement workspace is just a click away.</p></div><Link to="/login" className="landing-primary">Get started <ArrowRight size={18}/></Link></section>
    </main><footer className="landing-footer"><Brand /><p>Clarity for every purchasing decision.</p><span>© {new Date().getFullYear()} ProcureIQ</span></footer>
  </div>;
}
