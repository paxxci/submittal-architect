import React, { useState } from 'react'
import {
    Folder, FileText, ChevronRight, ArrowLeft,
    User, Truck, CheckCircle, Search,
    FileCode, ExternalLink, ShieldCheck
} from 'lucide-react'
import './App.css'

const MOCK_DATA = {
    divisions: [
        { id: '26', title: 'Electrical', sections: 12, progress: 65 },
        { id: '27', title: 'Communications', sections: 4, progress: 20 },
        { id: '28', title: 'Electronic Safety', sections: 8, progress: 45 }
    ],
    specs: {
        '26': [
            { id: '260533', title: 'Raceways and Boxes', assignedTo: 'self', status: 'ready' },
            { id: '260519', title: 'Low-Voltage Electrical Power Conductors', assignedTo: 'vendor', status: 'pending' },
            { id: '261313', title: 'Medium-Voltage Circuit Breaker Switchgear', assignedTo: 'vendor', status: 'pending' },
            { id: '262416', title: 'Panelboards', assignedTo: 'self', status: 'ready' }
        ]
    },
    parts: {
        '260533': {
            1: { title: 'General', items: ['Reference Standards', 'Submittals', 'Quality Assurance'] },
            2: {
                title: 'Products', items: [
                    { name: '3/4" x 8\' Copper Ground Rod', sku: '0050562', manufacturer: 'Erico', match: 0.95 },
                    { name: 'Rigid Steel Conduit', sku: 'RSC-075', manufacturer: 'Wheatland', match: 1.0 }
                ]
            },
            3: { title: 'Execution', items: ['Installation', 'Testing', 'Protection'] }
        }
    }
}

function App() {
    const [view, setView] = useState('divisions') // divisions, specs, parts, product
    const [selectedDiv, setSelectedDiv] = useState(null)
    const [selectedSpec, setSelectedSpec] = useState(null)
    const [selectedPart, setSelectedPart] = useState(2)
    const [selectedProduct, setSelectedProduct] = useState(null)

    const renderDivisions = () => (
        <div className="grid-divisions animate-fade-in">
            {MOCK_DATA.divisions.map(div => (
                <div key={div.id} className="glass division-card" onClick={() => { setSelectedDiv(div); setView('specs'); }}>
                    <div className="electric-blue mb-4"><Folder size={40} /></div>
                    <h3 className="text-xl font-bold mb-1">Division {div.id}</h3>
                    <p className="text-gray-400 text-sm mb-4">{div.title}</p>
                    <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-electric-blue h-full" style={{ width: `${div.progress}%` }}></div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                        <span>{div.sections} Sections</span>
                        <span>{div.progress}% Complete</span>
                    </div>
                </div>
            ))}
        </div>
    )

    const renderSpecs = () => (
        <div className="animate-fade-in">
            <button className="btn-back" onClick={() => setView('divisions')}><ArrowLeft size={18} /> Back to Divisions</button>
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold">Division {selectedDiv.id}: {selectedDiv.title}</h2>
            </div>
            <div className="spec-list">
                {MOCK_DATA.specs[selectedDiv.id]?.map(spec => (
                    <div key={spec.id} className="glass spec-item" onClick={() => { setSelectedSpec(spec); setView('parts'); }}>
                        <div className="flex items-center gap-4">
                            <div className="text-gray-500"><FileCode size={24} /></div>
                            <div>
                                <h4 className="font-bold">{spec.id} - {spec.title}</h4>
                                <div className="flex gap-4 mt-1">
                                    <div className={`badge ${spec.assignedTo === 'self' ? 'badge-self' : 'badge-vendor'}`}>
                                        {spec.assignedTo === 'self' ? <User size={10} className="inline mr-1" /> : <Truck size={10} className="inline mr-1" />}
                                        {spec.assignedTo === 'self' ? 'Self-Perform' : 'Vendor Managed'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-700" />
                    </div>
                ))}
            </div>
        </div>
    )

    const renderParts = () => {
        const partData = MOCK_DATA.parts[selectedSpec.id]
        return (
            <div className="animate-fade-in">
                <button className="btn-back" onClick={() => setView('specs')}><ArrowLeft size={18} /> Back to Specs</button>
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-1">{selectedSpec.id} - {selectedSpec.title}</h2>
                    <p className="text-gray-400">Section Shredder: Deep Drill-Down</p>
                </div>

                <div className="part-tabs">
                    {[1, 2, 3].map(p => (
                        <div
                            key={p}
                            className={`tab ${selectedPart === p ? 'active' : ''}`}
                            onClick={() => setSelectedPart(p)}
                        >
                            Part {p} - {partData[p].title}
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    {selectedPart === 2 ? (
                        <div className="product-grid">
                            {partData[2].items.map((prod, idx) => (
                                <div key={idx} className="glass product-card" onClick={() => { setSelectedProduct(prod); setView('product'); }}>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-lg">{prod.name}</h4>
                                        <span className="badge badge-self">Match {Math.round(prod.match * 100)}%</span>
                                    </div>
                                    <div className="text-sm text-gray-500">SKU: {prod.sku}</div>
                                    <div className="flex items-center gap-2 text-xs text-electric-blue uppercase font-bold mt-2">
                                        <Search size={14} /> View Cutsheet
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="spec-list">
                            {partData[selectedPart].items.map((item, idx) => (
                                <div key={idx} className="glass spec-item border-none">
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderProduct = () => (
        <div className="animate-fade-in">
            <button className="btn-back" onClick={() => setView('parts')}><ArrowLeft size={18} /> Back to Products</button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-4xl font-bold mb-4">{selectedProduct.name}</h2>
                    <div className="flex gap-4 mb-8">
                        <div className="glass px-4 py-2">
                            <span className="text-xs text-gray-500 block uppercase">Manufacturer</span>
                            <span className="font-bold">{selectedProduct.manufacturer}</span>
                        </div>
                        <div className="glass px-4 py-2">
                            <span className="text-xs text-gray-500 block uppercase">SKU</span>
                            <span className="font-bold">{selectedProduct.sku}</span>
                        </div>
                    </div>

                    <div className="glass p-6">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-green-400">
                            <ShieldCheck size={20} /> AI Verification Result
                        </h3>
                        <p className="text-gray-300">
                            Detected exact match for <strong>3/4" Diameter</strong> and <strong>8' Length</strong>.
                            Copper coating thickness meets spec section <strong>26 05 33</strong> requirements.
                        </p>
                    </div>
                </div>

                <div className="glass p-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold flex items-center gap-2"><FileText size={18} /> Annotated Cutsheet</span>
                        <button className="text-electric-blue flex items-center gap-1 text-sm"><ExternalLink size={14} /> Full PDF</button>
                    </div>
                    <div className="pdf-preview-box">
                        <div className="text-center">
                            <div className="red-box-highlight mb-4 inline-block font-mono text-xl">3/4" x 8'</div>
                            <p className="text-xs text-gray-500">Cutsheet Coordinate Map: Page 1, X:150, Y:340</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="app-container">
            <div className="sidebar glass border-none rounded-none">
                <div className="font-bold text-2xl tracking-tighter electric-blue">SUBMITTAL<br />ARCHITECT</div>

                <nav className="flex flex-col gap-4 mt-8">
                    <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${view === 'divisions' ? 'bg-electric-blue bg-opacity-10 text-white' : 'text-gray-500'}`} onClick={() => setView('divisions')}>
                        <Folder size={20} /> Projects
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg text-gray-500 cursor-not-allowed">
                        <User size={20} /> Team
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg text-gray-500 cursor-not-allowed">
                        <Truck size={20} /> Vendors
                    </div>
                </nav>

                <div className="mt-auto glass p-4 text-xs">
                    <div className="font-bold text-gray-400 mb-2">ACTIVE PROJECT</div>
                    <div className="text-white font-bold text-lg leading-tight">Luxury High-Rise<br />Tower A</div>
                </div>
            </div>

            <main className="main-content">
                {view === 'divisions' && renderDivisions()}
                {view === 'specs' && renderSpecs()}
                {view === 'parts' && renderParts()}
                {view === 'product' && renderProduct()}
            </main>
        </div>
    )
}

export default App
