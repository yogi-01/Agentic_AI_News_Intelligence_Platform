from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import (
    fetch_node,
    filter_node,
    summarize_node,
    briefing_node,
    delivery_node
)

def build_agent():
    # Create the graph with our state schema
    graph = StateGraph(AgentState)

    # Add all 5 nodes
    graph.add_node("fetch", fetch_node)
    graph.add_node("filter", filter_node)
    graph.add_node("summarize", summarize_node)
    graph.add_node("briefing", briefing_node)
    graph.add_node("delivery", delivery_node)

    # Define the linear flow
    graph.add_edge("fetch", "filter")
    graph.add_edge("filter", "summarize")
    graph.add_edge("summarize", "briefing")
    graph.add_edge("briefing", "delivery")
    graph.add_edge("delivery", END)

    # Set entry point
    graph.set_entry_point("fetch")

    # Compile and return
    return graph.compile()

# Create the agent instance
agent = build_agent()