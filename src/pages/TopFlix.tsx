import classNames from "classnames";
import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

import { getMediaPoster } from "@/backend/metadata/tmdb";
import { ThiccContainer } from "@/components/layout/ThinContainer";
import { Divider } from "@/components/utils/Divider";
import { Heading1, Paragraph } from "@/components/utils/Text";

import { SubPageLayout } from "./layouts/SubPageLayout";
// import { MediaGrid } from "@/components/media/MediaGrid"
// import { TopFlixCard } from "@/components/media/FlixCard";

function Button(props: {
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className={classNames(
        "font-bold rounded h-10 w-40 scale-95 hover:scale-100 transition-all duration-200",
        props.className,
      )}
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

function ConfigValue(props: { name: string; children?: ReactNode }) {
  return (
    <>
      <div className="flex">
        <p className="flex-1 font-bold text-white pr-5">
          <Link
            to={`https://sudo-flix.lol/browse/${props.name}`}
            className="hover:underline"
          >
            {props.name}
          </Link>
        </p>
        <p>{props.children}</p>
      </div>
      <Divider marginClass="my-3" />
    </>
  );
}

async function getRecentPlayedItems() {
  const response = await fetch("https://backend.sudo-flix.lol/metrics");
  const text = await response.text();

  const regex =
    /mw_media_watch_count{tmdb_full_id="([^"]+)",provider_id="([^"]+)",title="([^"]+)",success="([^"]+)"} (\d+)/g;
  let match;
  const loop = true;
  const items: { [key: string]: any } = {};

  while (loop) {
    match = regex.exec(text);
    if (match === null) break;

    const [_, tmdbFullId, providerId, title, success, count] = match;
    if (items[tmdbFullId]) {
      items[tmdbFullId].count += parseInt(count, 10);
    } else {
      items[tmdbFullId] = {
        tmdbFullId,
        providerId,
        title,
        success: success === "true",
        count: parseInt(count, 10),
      };
    }
  }

  if (Object.keys(items).length > 0) {
    return Object.values(items);
  }
  throw new Error("RECENT_PLAYED_ITEMS not found");
}

async function getTotalViews() {
  const response = await fetch("https://backend.sudo-flix.lol/metrics");
  const text = await response.text();

  // Regex to match the view counts of all shows/movies with success="true"
  const regex = /mw_media_watch_count{[^}]*,success="true"} (\d+)/g;
  let totalViews = 0;
  let match = regex.exec(text);

  while (match !== null) {
    totalViews += parseInt(match[1], 10);
    match = regex.exec(text);
  }

  if (totalViews > 0) {
    return totalViews.toString();
  }
  throw new Error("TOTAL_VIEWS not found");
}

export function TopFlix() {
  const [recentPlayedItems, setRecentPlayedItems] = useState<any[]>([]);
  const [totalViews, setTotalViews] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const maxItemsToShow = 100; // Maximum items to show
  const maxPageCount = Math.ceil(maxItemsToShow / itemsPerPage); // Calculate max page count based on maxItemsToShow

  useEffect(() => {
    getRecentPlayedItems()
      .then((items) => {
        // Limit the items to the first 100 to ensure we don't exceed the max page count
        const limitedItems = items
          .slice(0, maxItemsToShow)
          .filter(
            (item, index, self) =>
              index ===
              self.findIndex((t2) => t2.tmdbFullId === item.tmdbFullId),
          );

        setRecentPlayedItems(limitedItems);
      })
      .catch((error) => {
        console.error("Error fetching recent played items:", error);
      })
      .finally(() => {
        setLoading(false);
      });
    getTotalViews()
      .then((views) => {
        setTotalViews(views);
      })
      .catch((error) => {
        console.error("Error fetching total views:", error);
      });
  }, []);

  function getItemsForCurrentPage() {
    const sortedItems = recentPlayedItems.sort((a, b) => b.count - a.count);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedItems.slice(startIndex, endIndex);
  }

  if (loading) {
    return (
      <p className="flex items-center justify-center h-screen">Loading...</p>
    );
  }

  return (
    <SubPageLayout>
      <ThiccContainer classNames="px-4">
        <Heading1>Top flix</Heading1>
        <Paragraph className="mb-18">
          The most popular movies on sudo-flix.lol, this data is fetched from
          the current backend deployment.
        </Paragraph>
        <div className="mt-8 w-auto">
          <div className="bg-buttons-secondary rounded-xl py-5 px-7 inline-block">
            <p className="font-bold bg-opacity-90 text-buttons-secondaryText">
              Overall Views: {totalViews}
            </p>
          </div>
        </div>

        <div className="mt-8 w-full max-w-none">
          <Divider marginClass="my-3" />
          {getItemsForCurrentPage().map((item) => {
            const coverUrl = getMediaPoster(item.tmdbFullId);
            return (
              <ConfigValue key={item.tmdbFullId} name={item.title}>
                {`${item.providerId} - Views: `}
                <strong>{item.count}</strong>
              </ConfigValue>
            );
          })}
          <div
            style={{ display: "flex", justifyContent: "space-between" }}
            className="mt-6"
          >
            <Button
              className="py-px box-content bg-buttons-secondary hover:bg-buttons-secondaryHover bg-opacity-90 text-buttons-secondaryText justify-center items-center"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous page
            </Button>
            <div>
              {currentPage} / {maxPageCount}
            </div>
            <Button
              className="py-px box-content bg-buttons-secondary hover:bg-buttons-secondaryHover bg-opacity-90 text-buttons-secondaryText justify-center items-center"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === maxPageCount}
            >
              Next page
            </Button>
          </div>
        </div>
      </ThiccContainer>
    </SubPageLayout>
  );
}
