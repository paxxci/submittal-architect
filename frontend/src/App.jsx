import React, { useState } from 'react'
import {
    LayoutDashboard, FileSearch, ClipboardCheck, 
    Settings, Bell, Search, ChevronRight, 
    MoreHorizontal, CheckCircle2, Clock, 
    ArrowUpRight, Plus, Box, ShieldCheck,
    FileText, ExternalLink
} from 'lucide-react'
import './App.css'

const MOCK_PROJECT = {
    name: "Luxury High-Rise Tower A",
    client: "Figma - Devops", // Using the image inspiration
    progress: 60,
    daysLeft: 2,
    divisions: [
        { id: '26', title: 'Electrical', status: 'In progress', tasks: 6, completed: 4 },
        { id: '27', title: 'Communications', status: 'Pending', tasks: 4, completed: 0 },
        { id: '28', title: 'Electronic Safety', status: 'In progress', tasks: 11, completed: 2 }
    ],
    recentItems: [
        { id: '260533', title: 'Raceways and Boxes', type: 'Spec', match: 95 },
        { id: '260519', title: 'Low-Voltage Power', type: 'Spec', match: 100 }
    ]
}

function App() {
    const [view, setView] = useState('dashboard') // dashboard, workbench
    const [selectedDivision, setSelectedDivision] = useState(null)

    const Dashboard = () => (
        <div className="dashboard-root animate-fade-in">
            {/* Header Area */}
            <div className="hero-section prism-card">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex gap-4 items-center">
                        <div className="project-icon bg-accent-primary">
                            <Box size={24} color="white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight">{MOCK_PROJECT.name}</h1>
                            <p className="text-text-muted text-sm">{MOCK_PROJECT.client}</p>
                        </div>
                    </div>
                    <span className="badge badge-orange font-bold">In Progress</span>
                </div>

                <div className="progress-container mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{MOCK_PROJECT.progress}% complete</span>
                        <span className="text-text-muted">{MOCK_PROJECT.daysLeft} days left</span>
                    </div>
                    <div className="progress-bar-bg h-2 rounded-full overflow-hidden">
                        <div className="progress-fill h-full bg-accent-primary glow-orange" style={{ width: `${MOCK_PROJECT.progress}%` }}></div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="avatar-circle"></div>
                    ))}
                    <div className="avatar-count">+4</div>
                    <div className="ml-auto text-text-muted text-xs flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock size={12} /> Start: Nov 12</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} /> End: Dec 12</span>
                    </div>
                </div>
            </div>

            {/* Divisions Section */}
            <div className="mt-8">
                <h2 className="text-lg font-bold mb-4 px-2">Project Divisions</h2>
                <div className="space-y-4">
                    {MOCK_PROJECT.divisions.map(div => (
                        <div key={div.id} className="division-row prism-card" onClick={() => { setSelectedDivision(div); setView('workbench'); }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`status-node ${div.completed === div.tasks ? 'complete' : 'in-progress'}`}>
                                        {div.completed === div.tasks ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Division {div.id} - {div.title}</h3>
                                        <p className="text-xs text-text-muted">{div.tasks} Sections Found</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <span className={`badge ${div.completed === div.tasks ? 'badge-green' : 'badge-orange'}`}>
                                            {div.completed}/{div.tasks} Ready
                                        </span>
                                    </div>
                                    <ChevronRight className="text-text-muted" size={20} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const Workbench = () => (
        <div className="workbench-root animate-fade-in">
            <div className="workbench-header flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button className="btn-icon" onClick={() => setView('dashboard')}><LayoutDashboard size={20} /></button>
                    <div>
                        <h2 className="text-xl font-extrabold">Division {selectedDivision.id}</h2>
                        <p className="text-xs text-text-muted">{selectedDivision.title} Workbench</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">AI Shredder</button>
                    <button className="btn-primary">Approve All</button>
                </div>
            </div>

            <div className="workbench-grid">
                {/* Left side: Spec List */}
                <div className="workbench-sidebar space-y-3">
                    {MOCK_PROJECT.recentItems.map(item => (
                        <div key={item.id} className="item-card prism-card active">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-text-muted font-mono">{item.id}</span>
                                <span className="badge badge-green">{item.match}% Match</span>
                            </div>
                            <h4 className="font-bold text-sm leading-tight mb-2">{item.title}</h4>
                            <div className="flex justify-between items-center">
                                <div className="flex -space-x-2">
                                    <div className="avatar-xs"></div>
                                    <div className="avatar-xs"></div>
                                </div>
                                <button className="text-accent-primary"><ArrowUpRight size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right side: Detail View */}
                <div className="workbench-main prism-card">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">26 05 33 - Raceways and Boxes</h3>
                        <div className="flex gap-2">
                            <span className="badge badge-green"><ShieldCheck size={12} className="inline mr-1" /> Verified</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="mb-6">
                                <label className="text-xs text-text-muted uppercase font-bold block mb-2">Requirements</label>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-accent-secondary" /> NEMA 3R Enclosures</li>
                                    <li className="flex items-center gap-2 text-sm"><CheckCircle2 size={14} className="text-accent-secondary" /> UL Listed Components</li>
                                    <li className="flex items-center gap-2 text-sm text-text-muted"><Clock size={14} /> Grounding Straps required</li>
                                </ul>
                            </div>
                            
                            <div className="ai-insight p-4 rounded-xl bg-accent-primary bg-opacity-5 border border-accent-primary border-opacity-10">
                                <h4 className="flex items-center gap-2 font-bold text-accent-primary mb-2 text-sm">
                                    <Bell size={14} /> AI Insight: Product Match
                                </h4>
                                <p className="text-xs text-text-muted leading-relaxed">
                                    The Erico 3/4" rod matches these specs exactly. Coordinate Page 1 (150, 340) verified for coating thickness.
                                </p>
                            </div>
                        </div>

                        <div className="pdf-preview-prism">
                            <div className="flex justify-between items-center p-3 border-b border-border-subtle">
                                <span className="text-xs font-bold text-text-muted"><FileText size={12} className="inline mr-1" /> CUTSHEET_V1.PDF</span>
                                <ExternalLink size={12} className="text-text-muted" />
                            </div>
                            <div className="pdf-canvas">
                                <div className="highlight-box">3/4" x 8'</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="app-shell bg-bg-deep">
            {/* Nav Rail */}
            <aside className="nav-rail">
                <div className="logo-area">
                    <div className="logo-prism">SA</div>
                </div>
                <nav className="rail-icons">
                    <button className={`rail-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
                        <LayoutDashboard size={20} />
                    </button>
                    <button className={`rail-btn ${view === 'workbench' ? 'active' : ''}`} onClick={() => setView('workbench')}>
                        <FileSearch size={20} />
                    </button>
                    <button className="rail-btn"><ClipboardCheck size={20} /></button>
                </nav>
                <div className="rail-footer">
                    <button className="rail-btn"><Settings size={20} /></button>
                    <div className="user-avatar"></div>
                </div>
            </aside>

            {/* Top Bar */}
            <header className="top-bar">
                <div className="search-field">
                    <Search size={16} className="text-text-muted" />
                    <input type="text" placeholder="Search specifications, vendors, or items..." />
                </div>
                <div className="header-actions">
                    <button className="btn-icon"><Bell size={20} /></button>
                    <button className="btn-primary flex items-center gap-2"><Plus size={16} /> New Submittal</button>
                </div>
            </header>

            {/* Main Stage */}
            <main className="main-stage">
                {view === 'dashboard' ? <Dashboard /> : <Workbench />}
            </main>
        </div>
    )
}

export default App
