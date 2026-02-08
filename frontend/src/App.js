import React, { useState, useEffect, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8000/api';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [rawGraph, setRawGraph] = useState(null);
  const [issues, setIssues] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('graph');
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [feedMessages, setFeedMessages] = useState([]);
  const [feedIndex, setFeedIndex] = useState(0);
  const graphRef = useRef();

  const allMessages = [
    { source: 'Gmail', from: 'alice', subject: 'Product Launch Date Confirmed', time: '9:00 AM', color: '#EF4444' },
    { source: 'Slack', from: 'bob', subject: 'Landing Page Update', time: '2:30 PM', channel: '#engineering', color: '#7C3AED' },
    { source: 'AI Notetaker', from: 'carol', subject: 'Marketing Sync Meeting', time: '11:00 AM', color: '#F59E0B' },
    { source: 'Slack', from: 'dave', subject: 'Campaign Copy Ready', time: '4:00 PM', channel: '#content', color: '#7C3AED' },
    { source: 'Gmail', from: 'eve', subject: 'Client Feedback on Beta', time: '10:00 AM', color: '#EF4444' },
    { source: 'Slack', from: 'frank', subject: 'Engineering Update', time: '3:00 PM', channel: '#engineering', color: '#7C3AED' },
    { source: 'AI Notetaker', from: 'alice', subject: 'All Hands - Launch Date Decision', time: '9:00 AM', color: '#F59E0B' },
    { source: 'Gmail', from: 'carol', subject: 'Updated Campaign Timeline', time: '2:00 PM', color: '#EF4444' },
    { source: 'Slack', from: 'bob', subject: 'API Specs Needed', time: '10:00 AM', channel: '#engineering', color: '#7C3AED' },
    { source: 'Gmail', from: 'eve', subject: 'New Enterprise Client Interest', time: '9:00 AM', color: '#EF4444' },
    { source: 'Slack', from: 'eve', subject: 'Two More Enterprise Leads', time: '2:00 PM', channel: '#sales', color: '#7C3AED' },
    { source: 'AI Notetaker', from: 'alice', subject: 'Enterprise Strategy Discussion', time: '10:00 AM', color: '#F59E0B' },
    { source: 'Slack', from: 'alice', subject: 'Weekly Update from CEO', time: '9:00 AM', channel: '#general', color: '#7C3AED' },
    { source: 'Google Drive', from: 'carol', subject: 'Campaign Strategy Deck - Updated', time: '11:00 AM', color: '#10B981' },
    { source: 'Gmail', from: 'frank', subject: 'API Specs for Pricing Page', time: '4:00 PM', color: '#EF4444' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (feedIndex >= allMessages.length) return;
    const timer = setTimeout(() => {
      setFeedMessages(prev => [allMessages[feedIndex], ...prev]);
      setFeedIndex(prev => prev + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [feedIndex]);

  const loadData = async () => {
    try {
      const [graphRes, issuesRes, decisionsRes, depsRes] = await Promise.all([
        axios.get(API + '/graph'),
        axios.get(API + '/issues'),
        axios.get(API + '/decisions'),
        axios.get(API + '/dependencies'),
      ]);

      const raw = graphRes.data;
      setRawGraph(raw);

      const nodes = raw.nodes.map(function(n) {
        return {
          id: n.id,
          type: n.type,
          messages_sent: n.messages_sent || 0,
          mention_count: n.mention_count || 0,
          val: n.type === 'person' ? 14 : n.type === 'topic' ? 7 : 5,
        };
      });

      const links = raw.edges
        .filter(function(e) { return e.type === 'communication' || e.type === 'discusses'; })
        .map(function(e) {
          return {
            source: e.source,
            target: e.target,
            type: e.type,
            weight: e.weight || 1,
          };
        });

      setGraphData({ nodes: nodes, links: links });
      setIssues(issuesRes.data);
      setDecisions(decisionsRes.data);
      setDependencies(depsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await axios.post(API + '/ask', { question: question });
      setAnswer(res.data.answer);
    } catch (err) {
      setAnswer('Error getting response.');
    }
    setLoading(false);
  };

  const getNodeColor = useCallback(function(node) {
    if (node.type === 'person') return '#4F46E5';
    if (node.type === 'topic') return '#10B981';
    if (node.type === 'action_item') return '#F59E0B';
    return '#6B7280';
  }, []);

  const getLinkColor = useCallback(function(link) {
    if (link.type === 'communication') return 'rgba(79, 70, 229, 0.4)';
    return 'rgba(107, 114, 128, 0.15)';
  }, []);

  const handleNodeClick = useCallback(function(node) {
    setSelectedNode(node);
    if (!rawGraph) return;

    var nodeId = node.id;
    var connectedEdges = rawGraph.edges.filter(function(e) {
      return e.source === nodeId || e.target === nodeId;
    });
    var connectedNodeIds = new Set();
    connectedEdges.forEach(function(e) {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    var relatedDecisions = rawGraph.decisions.filter(function(d) {
      return d.made_by === nodeId || d.decision.toLowerCase().includes(nodeId.replace('@startup.com', '').toLowerCase());
    });

    var relatedDeps = rawGraph.dependencies.filter(function(d) {
      var name = nodeId.replace('@startup.com', '').toLowerCase();
      return (d.blocker && d.blocker.toLowerCase().includes(name)) ||
             (d.blocked && d.blocked.toLowerCase().includes(name));
    });

    var connectedPeople = rawGraph.nodes.filter(function(n) {
      return n.type === 'person' && connectedNodeIds.has(n.id) && n.id !== nodeId;
    });

    var connectedTopics = rawGraph.nodes.filter(function(n) {
      return n.type === 'topic' && connectedNodeIds.has(n.id);
    });

    var actionItems = rawGraph.nodes.filter(function(n) {
      return n.type === 'action_item' && connectedNodeIds.has(n.id);
    });

    var documents = [];
    if (node.type === 'topic') {
      var topicName = nodeId.charAt(0).toUpperCase() + nodeId.slice(1);
      documents.push(
        { name: topicName + ' - Latest Brief.pdf', type: 'pdf', date: 'Jan 20, 2025' },
        { name: topicName + ' - Strategy Deck.pptx', type: 'pptx', date: 'Jan 18, 2025' }
      );
    }
    if (node.type === 'person') {
      var personName = nodeId.replace('@startup.com', '');
      documents.push(
        { name: personName + ' - Task Dashboard', type: 'link', date: 'Live' },
        { name: personName + ' - Recent Communications', type: 'log', date: 'Last 7 days' }
      );
    }

    setNodeDetail({
      node: node,
      connectedPeople: connectedPeople,
      connectedTopics: connectedTopics,
      actionItems: actionItems,
      relatedDecisions: relatedDecisions,
      relatedDeps: relatedDeps,
      documents: documents,
      edgeCount: connectedEdges.length,
    });
    setActiveTab('detail');
  }, [rawGraph]);

  var handleKeyPress = function(e) {
    if (e.key === 'Enter') askQuestion();
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#0F172A', color: '#E2E8F0', minHeight: '100vh' }}>

      <div style={{ padding: '12px 24px', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {"🧠"}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>OrgBrain</h1>
            <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>AI Chief of Staff</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {['Gmail', 'Slack', 'Google Drive', 'AI Notetaker'].map(function(s) {
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: '#1E293B', fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                <span style={{ color: '#94A3B8' }}>{s}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#1E293B', borderRadius: 8, padding: 3 }}>
          {['graph', 'feed', 'issues', 'decisions', 'ask'].map(function(tab) {
            return (
              <button
                key={tab}
                onClick={function() { setActiveTab(tab); setNodeDetail(null); }}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? '#4F46E5' : 'transparent',
                  color: activeTab === tab ? 'white' : '#94A3B8',
                  fontSize: 12, fontWeight: 500,
                }}
              >
                {tab === 'ask' ? 'Ask AI' : tab === 'issues' ? 'Issues' : tab === 'decisions' ? 'Decisions' : tab === 'feed' ? 'Live Feed' : 'Graph'}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 61px)' }}>

        <div style={{ flex: (activeTab === 'graph' && !nodeDetail) ? 1 : '0 0 50%', position: 'relative', borderRight: '1px solid #1E293B' }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeColor={getNodeColor}
            nodeVal={function(n) { return n.val; }}
            linkColor={getLinkColor}
            linkWidth={function(l) { return l.type === 'communication' ? l.weight * 1.5 : 0.3; }}
            linkDirectionalParticles={function(l) { return l.type === 'communication' ? 2 : 0; }}
            linkDirectionalParticleSpeed={0.004}
            backgroundColor="#0F172A"
            onNodeClick={handleNodeClick}
            nodeCanvasObject={function(node, ctx, globalScale) {
              var label = node.id.replace('@startup.com', '').replace('task: ', '');
              var fontSize = node.type === 'person' ? 14 / globalScale : 10 / globalScale;
              var color = getNodeColor(node);
              var isSelected = selectedNode && selectedNode.id === node.id;

              if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.val + 4, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
                ctx.fill();
              }

              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();

              if (node.type === 'person') {
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.stroke();
              }

              var fontWeight = node.type === 'person' ? 'bold ' : '';
              ctx.font = fontWeight + fontSize + 'px Sans-Serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#E2E8F0';
              var displayLabel = label.length > 22 ? label.substring(0, 22) + '...' : label;
              ctx.fillText(displayLabel, node.x, node.y + node.val + fontSize + 2);
            }}
          />

          <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#1E293B', borderRadius: 8, padding: '10px 14px', fontSize: 11 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <span><span style={{ color: '#4F46E5' }}>{"●"}</span> People</span>
              <span><span style={{ color: '#10B981' }}>{"●"}</span> Topics</span>
              <span><span style={{ color: '#F59E0B' }}>{"●"}</span> Tasks</span>
            </div>
            <div style={{ color: '#64748B', marginTop: 4, fontSize: 10 }}>Click any node to explore</div>
          </div>

          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
            {[
              { label: 'People', count: graphData.nodes.filter(function(n) { return n.type === 'person'; }).length, color: '#4F46E5' },
              { label: 'Topics', count: graphData.nodes.filter(function(n) { return n.type === 'topic'; }).length, color: '#10B981' },
              { label: 'Issues', count: issues.length, color: '#EF4444' },
              { label: 'Decisions', count: decisions.length, color: '#7C3AED' },
            ].map(function(s) {
              return (
                <div key={s.label} style={{ background: '#1E293B', borderRadius: 6, padding: '6px 12px', fontSize: 11 }}>
                  <span style={{ color: '#94A3B8' }}>{s.label + ' '}</span>
                  <span style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {(activeTab !== 'graph' || nodeDetail) && (
          <div style={{ flex: '0 0 50%', overflow: 'auto', padding: 20 }}>

            {activeTab === 'detail' && nodeDetail && (
              <div>
                <button onClick={function() { setActiveTab('graph'); setNodeDetail(null); setSelectedNode(null); }}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', marginBottom: 12, fontSize: 12 }}>
                  {"< Back to Graph"}
                </button>

                <div style={{ background: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: nodeDetail.node.type === 'person' ? '#4F46E5' : nodeDetail.node.type === 'topic' ? '#10B981' : '#F59E0B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      color: 'white', fontWeight: 'bold'
                    }}>
                      {nodeDetail.node.id.replace('@startup.com', '').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 20 }}>{nodeDetail.node.id.replace('@startup.com', '')}</h2>
                      <p style={{ margin: 0, color: '#94A3B8', fontSize: 12, textTransform: 'capitalize' }}>
                        {nodeDetail.node.type + ' | ' + nodeDetail.edgeCount + ' connections'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { val: nodeDetail.connectedPeople.length, label: 'People', color: '#4F46E5' },
                      { val: nodeDetail.connectedTopics.length, label: 'Topics', color: '#10B981' },
                      { val: nodeDetail.actionItems.length, label: 'Tasks', color: '#F59E0B' },
                      { val: nodeDetail.relatedDecisions.length, label: 'Decisions', color: '#7C3AED' },
                    ].map(function(item) {
                      return (
                        <div key={item.label} style={{ flex: 1, background: '#0F172A', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.val}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {nodeDetail.documents.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94A3B8' }}>Related Documents</h3>
                    {nodeDetail.documents.map(function(doc, i) {
                      return (
                        <div key={i} style={{ background: '#1E293B', borderRadius: 8, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                          <span style={{ fontSize: 13 }}>{doc.name}</span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>{doc.date}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {nodeDetail.relatedDecisions.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94A3B8' }}>Decisions</h3>
                    {nodeDetail.relatedDecisions.map(function(d, i) {
                      return (
                        <div key={i} style={{ background: '#1E293B', borderRadius: 8, padding: '10px 14px', marginBottom: 6, borderLeft: '3px solid #7C3AED' }}>
                          <p style={{ margin: 0, fontSize: 13 }}>{d.decision}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748B' }}>{new Date(d.timestamp).toLocaleDateString() + ' | ' + d.subject}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {nodeDetail.relatedDeps.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94A3B8' }}>Dependencies</h3>
                    {nodeDetail.relatedDeps.map(function(d, i) {
                      return (
                        <div key={i} style={{ background: '#1E293B', borderRadius: 8, padding: '10px 14px', marginBottom: 6, borderLeft: '3px solid #F59E0B' }}>
                          <p style={{ margin: 0, fontSize: 13 }}><strong>{d.blocker}</strong>{' blocks '}<strong>{d.blocked}</strong></p>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748B' }}>{d.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {nodeDetail.connectedPeople.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94A3B8' }}>Connected People</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {nodeDetail.connectedPeople.map(function(p, i) {
                        return (
                          <span key={i} onClick={function() {
                            var gNode = graphData.nodes.find(function(n) { return n.id === p.id; });
                            if (gNode) handleNodeClick(gNode);
                          }}
                            style={{ padding: '4px 10px', borderRadius: 20, background: '#4F46E5', fontSize: 12, cursor: 'pointer' }}>
                            {p.id.replace('@startup.com', '')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {nodeDetail.connectedTopics.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94A3B8' }}>Related Topics</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {nodeDetail.connectedTopics.map(function(t, i) {
                        return (
                          <span key={i} onClick={function() {
                            var gNode = graphData.nodes.find(function(n) { return n.id === t.id; });
                            if (gNode) handleNodeClick(gNode);
                          }}
                            style={{ padding: '4px 10px', borderRadius: 20, background: '#10B981', fontSize: 12, cursor: 'pointer' }}>
                            {t.id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {nodeDetail.actionItems.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, marginBottom: 8, color: '#94A3B8' }}>Action Items</h3>
                    {nodeDetail.actionItems.map(function(a, i) {
                      return (
                        <div key={i} style={{ background: '#1E293B', borderRadius: 8, padding: '10px 14px', marginBottom: 6, borderLeft: '3px solid #F59E0B' }}>
                          <p style={{ margin: 0, fontSize: 13 }}>{a.id.replace('task: ', '')}</p>
                          {a.deadline && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748B' }}>{'Deadline: ' + a.deadline}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'feed' && (
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>Live Communication Feed</h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Real-time ingestion from connected workspace</p>

                {feedMessages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                    <p>Listening for new communications...</p>
                  </div>
                )}

                {feedMessages.map(function(msg, i) {
                  return (
                    <div key={i} style={{
                      background: '#1E293B', borderRadius: 10, padding: '12px 16px', marginBottom: 8,
                      borderLeft: '3px solid ' + msg.color,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: msg.color, fontWeight: 600 }}>{msg.source}</span>
                          {msg.channel && <span style={{ fontSize: 10, color: '#64748B' }}>{msg.channel}</span>}
                        </div>
                        <span style={{ fontSize: 10, color: '#64748B' }}>{msg.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13 }}>{msg.subject}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>{'from ' + msg.from}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'issues' && (
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>Detected Issues</h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Conflicts, risks, and bottlenecks found by Critic Agent</p>
                {issues.map(function(issue, i) {
                  var sevColor = issue.severity === 'high' ? '#EF4444' : issue.severity === 'medium' ? '#F59E0B' : '#10B981';
                  return (
                    <div key={i} style={{
                      background: '#1E293B', borderRadius: 10, padding: 16, marginBottom: 10,
                      borderLeft: '4px solid ' + sevColor
                    }}>
                      <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, color: sevColor }}>
                        {issue.type + ' - ' + issue.severity}
                      </span>
                      <p style={{ margin: '6px 0', fontSize: 13 }}>{issue.description}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#94A3B8' }}>{'People: ' + (issue.people_involved ? issue.people_involved.join(', ') : '')}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#10B981' }}>{'Fix: ' + issue.recommendation}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'decisions' && (
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>Decision Timeline</h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Version-stamped decisions across the organization</p>
                {decisions.map(function(d, i) {
                  return (
                    <div key={i} style={{ background: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 8, borderLeft: '4px solid #4F46E5' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500 }}>{d.decision}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
                        {'By ' + d.made_by + ' | ' + new Date(d.timestamp).toLocaleDateString() + ' | ' + d.subject}
                      </p>
                    </div>
                  );
                })}

                <h2 style={{ fontSize: 18, margin: '20px 0 4px' }}>Dependencies</h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Who is blocking whom</p>
                {dependencies.map(function(d, i) {
                  return (
                    <div key={i} style={{ background: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 8, borderLeft: '4px solid #F59E0B' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 13 }}><strong>{d.blocker}</strong>{' blocks '}<strong>{d.blocked}</strong></p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{d.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'ask' && (
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>Ask Your AI Chief of Staff</h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Ask anything about your organization</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    value={question}
                    onChange={function(e) { setQuestion(e.target.value); }}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g. What changed today? Who is blocking the launch?"
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #334155',
                      background: '#1E293B', color: 'white', fontSize: 13, outline: 'none',
                    }}
                  />
                  <button onClick={askQuestion} disabled={loading}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4F46E5', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {loading ? '...' : 'Ask'}
                  </button>
                </div>
                {answer && (
                  <button
                    onClick={async function() {
                      try {
                        var res = await axios.post(API + '/speak', { question: answer.substring(0, 500) });
                        if (res.data.audio) {
                          var audio = new Audio('data:audio/mpeg;base64,' + res.data.audio);
                          audio.play();
                        }
                      } catch (err) {
                        console.error('TTS error:', err);
                      }
                    }}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#E2E8F0', cursor: 'pointer', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {"🔊 Read aloud"}
                  </button>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[
                    'What changed today?',
                    'Who is blocking the launch?',
                    'What are the biggest risks?',
                    'Summarize all decisions',
                    'What does Frank need to do?',
                    'What is the marketing budget?',
                    'Who are our enterprise clients?',
                  ].map(function(q) {
                    return (
                      <button key={q} onClick={function() { setQuestion(q); }}
                        style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontSize: 11, cursor: 'pointer' }}>
                        {q}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={function() {
                    if (!SpeechRecognition) { alert('Use Chrome for speech recognition.'); return; }
                    var recognition = new SpeechRecognition();
                    recognition.lang = 'en-US';
                    recognition.onresult = function(event) { setQuestion(event.results[0][0].transcript); };
                    recognition.start();
                  }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#E2E8F0', cursor: 'pointer', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {"🎤 Speak your question"}
                </button>

                {answer && (
                  <div style={{ background: '#1E293B', borderRadius: 10, padding: 16, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>
                    {answer}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default App;